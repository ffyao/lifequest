const templates = {
  学习: {
    keyword: ['学习', '编程', '考试', '课程', 'Vue', 'React', '英语', '数学', '算法', 'Python', 'Java', '前端', '后端', '复习', 'JavaScript'],
    tasks: [
      ['main', 'normal', '绘制知识地图', '梳理目标领域的核心知识点，确定本周学习路线。'],
      ['side', 'easy', '完成资料收集', '整理 3 个高质量教程、视频或参考资料。'],
      ['daily', 'easy', '完成 25 分钟专注学习', '使用番茄钟完成一次无打断学习。'],
      ['daily', 'normal', '输出一份学习笔记', '用自己的话总结今天学到的 3 个重点。'],
      ['boss', 'hard', '完成一个实战小作品', '用所学知识完成一个可展示的小 Demo。']
    ],
    npc: [
      '知识副本已经开启，勇者先从最小的一步开始。',
      '今天的任务不求完美，但求推进。',
      '把复杂知识拆小，你就已经赢了一半。',
      '每学完一个知识点，你的角色都在悄悄升级。'
    ]
  },
  健身: {
    keyword: ['健身', '跑步', '减脂', '增肌', '运动', '体重', '腹肌', '引体向上', '俯卧撑', '瑜伽', '深蹲'],
    tasks: [
      ['main', 'normal', '制定训练计划', '确定本周训练频率、动作和休息安排。'],
      ['side', 'easy', '记录身体初始状态', '记录体重、围度或今日运动感受。'],
      ['daily', 'easy', '完成 15 分钟热身', '进行动态拉伸和基础激活。'],
      ['daily', 'normal', '完成一次正式训练', '完成跑步、力量或核心训练。'],
      ['boss', 'hard', '完成周挑战', '完成一次比平时更高强度的挑战。']
    ],
    npc: [
      '体能副本开启，稳住节奏比冲太猛更重要。',
      '今天动起来就是胜利。',
      '你的角色正在一点点变强。',
      '汗水是勇者最好的装备，今天加油！'
    ]
  },
  阅读: {
    keyword: ['阅读', '读书', '书籍', '小说', '名著', '散文', '书评', '书单'],
    tasks: [
      ['main', 'normal', '确定阅读清单', '选择一本主读书和一本备用书。'],
      ['side', 'easy', '建立摘录区域', '准备一个用于摘录金句和观点的笔记。'],
      ['daily', 'easy', '阅读 10 页', '完成至少 10 页阅读，不追求速度。'],
      ['daily', 'normal', '写 100 字读后感', '记录今天最触动你的一个观点。'],
      ['boss', 'hard', '完成整本书复盘', '整理书籍结构、核心观点和个人启发。']
    ],
    npc: [
      '阅读副本已解锁，慢慢读也算前进。',
      '每一页都是经验值。',
      '今天的你正在和更大的世界对话。',
      '翻开书的那一刻，副本就已经开始了。'
    ]
  },
  创作: {
    keyword: ['写作', '创作', '视频', '自媒体', '绘画', '设计', '小说', '公众号', 'B站', '短视频', '剪辑', '插画'],
    tasks: [
      ['main', 'normal', '确定创作主题', '明确作品主题、受众和表达风格。'],
      ['side', 'easy', '收集灵感素材', '收集 5 个参考案例或灵感片段。'],
      ['daily', 'easy', '完成 15 分钟自由创作', '先产出草稿，不急着修改。'],
      ['daily', 'normal', '打磨一个作品片段', '优化标题、开头或关键画面。'],
      ['boss', 'hard', '发布一个完整作品', '完成并公开发布一个小作品。']
    ],
    npc: [
      '创作副本开启，先允许自己写得不完美。',
      '灵感不会等人，先记录下来。',
      '完成比完美更能升级。',
      '你的每一次输出，都在为角色积累创作经验值。'
    ]
  },
  生活: {
    keyword: ['早睡', '自律', '整理', '生活', '习惯', '时间', '冥想', '喝水', '断舍离', '作息', '睡眠', '日记'],
    tasks: [
      ['main', 'normal', '建立习惯规则', '定义一个清晰、可执行的生活习惯。'],
      ['side', 'easy', '清理一个干扰源', '移除一个容易打断你的环境因素。'],
      ['daily', 'easy', '完成一次 10 分钟整理', '整理桌面、书包或待办清单。'],
      ['daily', 'normal', '执行今日核心习惯', '完成今天最重要的一项习惯动作。'],
      ['boss', 'hard', '完成 3 天连续挑战', '连续 3 天执行同一个关键习惯。']
    ],
    npc: [
      '生活副本不靠爆发，靠每天一点点稳定输出。',
      '小习惯也是大装备。',
      '今天完成一件事，就已经在变强。',
      '稳定的生活节奏，是勇者最坚实的护甲。'
    ]
  }
};

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
              'tasks 必须正好 5 个：1 个 main、1 个 side、2 个 daily、1 个 boss。',
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
  if (!Array.isArray(tasks) || tasks.length !== 5) {
    const error = new Error('DeepSeek 必须返回 5 个副本任务');
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

  if (counts.main !== 1 || counts.side !== 1 || counts.daily !== 2 || counts.boss !== 1) {
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
  const text = `${goal.title} ${goal.description} ${goal.category}`.toLowerCase();
  for (const [category, template] of Object.entries(templates)) {
    if (template.keyword.some((keyword) => text.includes(keyword.toLowerCase()))) {
      return category;
    }
  }
  return templates[goal.category] ? goal.category : '生活';
}
