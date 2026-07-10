export function createAiService(database) {
  return {
    getSettings(userId) {
      const settings = database
        .prepare('SELECT deepseekApiKey FROM user_settings WHERE userId = ?')
        .get(userId);

      return {
        deepseekKeyConfigured: Boolean(settings?.deepseekApiKey),
        model: 'deepseek-v4-flash'
      };
    },

    saveDeepseekApiKey(userId, apiKey) {
      const normalizedApiKey = normalizeApiKey(apiKey);
      database
        .prepare(`
          INSERT INTO user_settings (userId, deepseekApiKey, updatedAt)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(userId) DO UPDATE SET
            deepseekApiKey = excluded.deepseekApiKey,
            updatedAt = CURRENT_TIMESTAMP
        `)
        .run(userId, normalizedApiKey);

      return this.getSettings(userId);
    },

    async generateTasks(userId, goal, options = {}) {
      const providedApiKey = String(options.deepseekApiKey || '').trim();
      const apiKey = providedApiKey ? normalizeApiKey(providedApiKey) : getDeepseekApiKey(database, userId);
      if (!apiKey) {
        const error = new Error('首次生成任务前，请先配置 DeepSeek API Key');
        error.statusCode = 400;
        error.code = 'DEEPSEEK_API_KEY_REQUIRED';
        throw error;
      }

      const category = pickCategory(goal);
      const aiResult = await requestDeepseekTasks(apiKey, userId, goal, category);
      const tasks = normalizeTasks(aiResult.tasks);
      const npcMessage = normalizeText(aiResult.npcMessage, 'NPC 引导文案', 4, 80);

      const result = {
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
        category,
        npcMessage,
        tasks
      };

      return result;
    },

    recordGeneration(userId, goal, result) {
      database
        .prepare('INSERT INTO ai_logs (userId, input, output, model) VALUES (?, ?, ?, ?)')
        .run(userId, JSON.stringify(goal), JSON.stringify(result), 'deepseek-v4-flash');
    },

    listLogs(userId) {
      return database
        .prepare('SELECT * FROM ai_logs WHERE userId = ? ORDER BY createdAt DESC, id DESC LIMIT 20')
        .all(userId);
    }
  };
}

function normalizeApiKey(apiKey) {
  const normalizedApiKey = String(apiKey || '').trim();
  if (normalizedApiKey.length < 10) {
    const error = new Error('DeepSeek API Key 格式不正确');
    error.statusCode = 400;
    error.code = 'INVALID_DEEPSEEK_API_KEY';
    throw error;
  }
  return normalizedApiKey;
}

function getDeepseekApiKey(database, userId) {
  const settings = database
    .prepare('SELECT deepseekApiKey FROM user_settings WHERE userId = ?')
    .get(userId);
  return settings?.deepseekApiKey || '';
}

async function requestDeepseekTasks(apiKey, userId, goal, category) {
  let response;
  try {
    response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          {
            role: 'system',
            content: [
              '你是 LifeQuest 人生副本任务系统的任务设计器。',
              '必须只输出合法 JSON，不要输出 Markdown，不要输出额外解释。',
              'JSON 结构必须是 {"npcMessage": string, "tasks": Task[]}。',
              '任务只能由你根据目标现场生成，不得使用固定模板、通用模板或兜底样例。',
              'tasks 必须返回 3 到 6 个任务。',
              'main、daily、boss 为必选类型：至少 1 个 main，至少 1 个 daily，至少 1 个 boss。',
              'side 为可选类型：可返回 0 到 2 个 side，不要为了凑数强行生成支线。',
              'daily 表示每天可以完成一次的重复任务，标题和描述必须适合每日重复执行。',
              'main 和 boss 是目标通关进度依据，boss 应体现该目标的最终挑战。',
              'Task 字段：type 为 main/side/daily/boss；difficulty 为 easy/normal/hard/boss。',
              'boss 类型任务的 difficulty 必须为 boss，其余任务不能使用 boss 难度。',
              'title 为 6 到 28 个中文字符；description 为 12 到 80 个中文字符。',
              '任务必须具体、可执行、适合用户目标，不要出现空泛口号。'
            ].join('\n')
          },
          {
            role: 'user',
            content: JSON.stringify({
              goal: {
                title: goal.title,
                description: goal.description || '',
                category: goal.category || category
              },
              outputLanguage: 'zh-CN'
            })
          }
        ],
        thinking: { type: 'disabled' },
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 1600,
        stream: false,
        user_id: `lifequest-${userId}`
      }),
      signal: AbortSignal.timeout(30000)
    });
  } catch (error) {
    const requestError = new Error(error.name === 'TimeoutError'
      ? 'DeepSeek 任务生成请求超时，请稍后重试'
      : 'DeepSeek 任务生成网络连接失败，请检查网络或 API Key');
    requestError.statusCode = 502;
    requestError.code = 'DEEPSEEK_NETWORK_ERROR';
    throw requestError;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const statusCode = response.status >= 400 && response.status < 500 ? 400 : 502;
    const error = new Error(buildDeepseekErrorMessage(payload, response.status));
    error.statusCode = statusCode;
    error.code = 'DEEPSEEK_REQUEST_FAILED';
    throw error;
  }

  const choice = payload.choices?.[0];
  if (choice?.finish_reason === 'length') {
    const error = new Error('DeepSeek 返回内容被截断，请稍后重试');
    error.statusCode = 502;
    error.code = 'DEEPSEEK_TRUNCATED_RESPONSE';
    throw error;
  }

  const content = choice?.message?.content;
  if (!content) {
    const error = new Error('DeepSeek 未返回任务内容');
    error.statusCode = 502;
    error.code = 'DEEPSEEK_EMPTY_RESPONSE';
    throw error;
  }

  return parseDeepseekJson(content);
}

function parseDeepseekJson(content) {
  const raw = String(content).trim();
  const withoutFence = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const error = new Error('DeepSeek 返回的任务 JSON 无法解析');
    error.statusCode = 502;
    error.code = 'DEEPSEEK_INVALID_JSON';
    throw error;
  }
}

function normalizeTasks(tasks) {
  if (!Array.isArray(tasks) || tasks.length < 3 || tasks.length > 6) {
    const error = new Error('DeepSeek 必须返回 3 到 6 个副本任务');
    error.statusCode = 502;
    error.code = 'DEEPSEEK_INVALID_TASKS';
    throw error;
  }

  const counts = { main: 0, side: 0, daily: 0, boss: 0 };
  const normalizedTasks = tasks.map((task) => {
    const type = normalizeTaskType(task.type);
    counts[type] += 1;
    const difficulty = normalizeDifficulty(task.difficulty, type);
    const title = normalizeText(task.title, '任务标题', 2, 40);
    const description = normalizeText(task.description, '任务描述', 6, 120);
    return {
      type,
      difficulty,
      title,
      description,
      xpReward: xpByDifficulty(difficulty)
    };
  });

  if (counts.main < 1 || counts.daily < 1 || counts.boss < 1 || counts.side > 2) {
    const error = new Error('DeepSeek 返回的任务类型组合不符合副本规则');
    error.statusCode = 502;
    error.code = 'DEEPSEEK_INVALID_TASK_TYPES';
    throw error;
  }

  return normalizedTasks;
}

function buildDeepseekErrorMessage(payload, status) {
  const message = payload?.error?.message || payload?.message;
  if (message) {
    return `DeepSeek 任务生成请求失败：${message}`;
  }
  if (status === 401 || status === 403) {
    return 'DeepSeek API Key 无效或无权限，请检查后重新配置';
  }
  if (status === 402) {
    return 'DeepSeek 账户余额不足，请前往平台确认后重试';
  }
  if (status === 429) {
    return 'DeepSeek 请求过于频繁，请稍后再试';
  }
  return 'DeepSeek 任务生成请求失败';
}

function normalizeTaskType(type) {
  const normalizedType = String(type || '').trim();
  if (!['main', 'side', 'daily', 'boss'].includes(normalizedType)) {
    const error = new Error('DeepSeek 返回了无效任务类型');
    error.statusCode = 502;
    error.code = 'DEEPSEEK_INVALID_TASK_TYPE';
    throw error;
  }
  return normalizedType;
}

function normalizeDifficulty(difficulty, type) {
  const normalizedDifficulty = String(difficulty || '').trim();
  const allowed = ['easy', 'normal', 'hard', 'boss'];
  if (!allowed.includes(normalizedDifficulty)) {
    const error = new Error('DeepSeek 返回了无效任务难度');
    error.statusCode = 502;
    error.code = 'DEEPSEEK_INVALID_TASK_DIFFICULTY';
    throw error;
  }
  if ((type === 'boss' && normalizedDifficulty !== 'boss') || (type !== 'boss' && normalizedDifficulty === 'boss')) {
    const error = new Error('DeepSeek 返回的任务类型与难度不匹配');
    error.statusCode = 502;
    error.code = 'DEEPSEEK_TASK_DIFFICULTY_MISMATCH';
    throw error;
  }
  return normalizedDifficulty;
}

function normalizeText(value, name, minLength, maxLength) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length < minLength || text.length > maxLength) {
    const error = new Error(`${name}不符合长度要求`);
    error.statusCode = 502;
    error.code = 'DEEPSEEK_INVALID_TASK_TEXT';
    throw error;
  }
  return text;
}

export function xpByDifficulty(difficulty) {
  return {
    easy: 20,
    normal: 40,
    hard: 80,
    boss: 150
  }[difficulty] || 20;
}

function pickCategory(goal) {
  const category = String(goal.category || '').trim();
  return category || '生活';
}
