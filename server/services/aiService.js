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
      const { aiResult, tasks, npcMessage } = await generateValidTaskSet(apiKey, userId, goal, category);

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

async function generateValidTaskSet(apiKey, userId, goal, category) {
  let lastError;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const aiResult = await requestDeepseekTasks(apiKey, userId, goal, category, {
      validationFeedback: lastError ? buildValidationFeedback(lastError) : ''
    });

    try {
      return {
        aiResult,
        tasks: normalizeTasks(aiResult.tasks),
        npcMessage: normalizeText(aiResult.npcMessage, 'NPC 引导文案', 4, 80)
      };
    } catch (error) {
      lastError = error;
      if (!isRetryableGenerationError(error) || attempt === 1) {
        throw error;
      }
    }
  }

  throw lastError;
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

async function requestDeepseekTasks(apiKey, userId, goal, category, options = {}) {
  let response;
  const validationFeedback = String(options.validationFeedback || '').trim();
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
              'main 和 boss 为必选类型：至少 1 个 main，至少 1 个 boss。',
              'daily 为可选类型：长期目标、习惯养成目标可生成 1 到 2 个 daily；短期目标、一次性目标、冲刺型目标允许不生成 daily。',
              'side 为可选类型：可返回 0 到 2 个 side，不要为了凑数强行生成支线。',
              'daily 表示每天可以完成一次的重复任务，标题和描述必须适合每日重复执行；如果目标不适合每天重复，就不要生成 daily。',
              'main 和 boss 是目标通关进度依据，boss 应体现该目标的最终挑战。',
              'Task 字段：type 为 main/side/daily/boss；difficulty 为 easy/normal/hard/boss；xpReward 为 5 到 220 的整数。',
              'xpReward 由你根据任务行动成本、难度和目标价值自行决定；daily 的经验通常应低于同等投入的 main/side，建议偏小但不要机械套用固定值。',
              '经验参考：daily 多数为 10 到 35，main/side 多数为 25 到 90，boss 多数为 80 到 180；参考范围不是硬模板，具体数值要贴合任务。',
              'boss 类型任务的 difficulty 必须为 boss，其余任务不能使用 boss 难度。',
              'title 为 6 到 28 个中文字符；description 为 12 到 80 个中文字符。',
              'title 和 description 必须是自然生成的内容，不得写成“任务内容：任务名称”“任务名称：...”等字段标签格式。',
              'title 不得包含中文或英文冒号，不得以“主线任务”“支线任务”“每日任务”“Boss任务”等类型标签开头。',
              '不要使用高频模板标题，不要用知识地图类、资料收集类、实战小目标类、实战小作品类通用标题。',
              '每个 title 都要绑定用户目标中的具体对象、场景或产出物，避免通用化标题。',
              '任务必须具体、可执行、适合用户目标，不要出现空泛口号。',
              validationFeedback
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
    const title = normalizeText(task.title, '任务标题', 2, 40, { field: 'title' });
    const description = normalizeText(task.description, '任务描述', 6, 120, { field: 'description' });
    return {
      type,
      difficulty,
      title,
      description,
      xpReward: normalizeXpReward(task.xpReward)
    };
  });

  if (counts.main < 1 || counts.boss < 1 || counts.side > 2 || counts.daily > 2) {
    const error = new Error('DeepSeek 返回的任务类型组合不符合副本规则');
    error.statusCode = 502;
    error.code = 'DEEPSEEK_INVALID_TASK_TYPES';
    throw error;
  }

  return normalizedTasks;
}

function isRetryableGenerationError(error) {
  return [
    'DEEPSEEK_INVALID_TASKS',
    'DEEPSEEK_INVALID_TASK_TYPES',
    'DEEPSEEK_INVALID_TASK_TYPE',
    'DEEPSEEK_INVALID_TASK_DIFFICULTY',
    'DEEPSEEK_TASK_DIFFICULTY_MISMATCH',
    'DEEPSEEK_INVALID_TASK_XP',
    'DEEPSEEK_INVALID_TASK_TEXT',
    'DEEPSEEK_TEMPLATE_TASK_TEXT'
  ].includes(error?.code);
}

function buildValidationFeedback(error) {
  return [
    `上一次生成未通过后端校验：${error.message || '任务格式不符合规则'}。`,
    '请重新生成完整 JSON，不要复用上一版标题或描述。',
    '尤其不要输出字段标签式标题，也不要输出通用模板化标题。'
  ].join('\n');
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

function normalizeXpReward(xpReward) {
  const normalizedXpReward = Number(xpReward);
  if (!Number.isInteger(normalizedXpReward) || normalizedXpReward < 5 || normalizedXpReward > 220) {
    const error = new Error('DeepSeek 返回了无效任务经验值');
    error.statusCode = 502;
    error.code = 'DEEPSEEK_INVALID_TASK_XP';
    throw error;
  }
  return normalizedXpReward;
}

function normalizeText(value, name, minLength, maxLength, options = {}) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length < minLength || text.length > maxLength) {
    const error = new Error(`${name}不符合长度要求`);
    error.statusCode = 502;
    error.code = 'DEEPSEEK_INVALID_TASK_TEXT';
    throw error;
  }
  validateGeneratedText(text, name, options.field);
  return text;
}

function validateGeneratedText(text, name, field) {
  const labelPattern = /(任务(内容|名称|标题|描述)|主线任务|支线任务|每日任务|Boss\s*任务|BOSS\s*任务|boss\s*任务)\s*[:：]/;
  if (labelPattern.test(text) || (field === 'title' && text.includes(':')) || (field === 'title' && text.includes('：'))) {
    const error = new Error(`${name}不能使用字段标签或冒号格式`);
    error.statusCode = 502;
    error.code = 'DEEPSEEK_TEMPLATE_TASK_TEXT';
    throw error;
  }

  if (field === 'title') {
    const normalizedText = text.replace(/\s+/g, '');
    const bannedPhrases = [
      '绘制知识地图',
      '建立知识地图',
      '完成实战小目标',
      '实战小目标',
      '完成一个实战小作品',
      '完成实战小作品',
      '实战小作品',
      '完成资料收集',
      '整理参考资料'
    ];
    if (bannedPhrases.some(phrase => normalizedText.includes(phrase))) {
      const error = new Error(`${name}过于模板化，请重新生成`);
      error.statusCode = 502;
      error.code = 'DEEPSEEK_TEMPLATE_TASK_TEXT';
      throw error;
    }
  }
}

function pickCategory(goal) {
  const category = String(goal.category || '').trim();
  return category || '生活';
}
