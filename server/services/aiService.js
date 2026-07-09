const templates = {
  学习: {
    keyword: ['学习', '编程', '考试', '课程', 'Vue', 'React', '英语', '数学'],
    tasks: [
      ['main', 'normal', '绘制知识地图', '梳理目标领域的核心知识点，确定本周学习路线。'],
      ['side', 'easy', '完成资料收集', '整理 3 个高质量教程、视频或参考资料。'],
      ['daily', 'easy', '完成 25 分钟专注学习', '使用番茄钟完成一次无打断学习。'],
      ['daily', 'normal', '输出一份学习笔记', '用自己的话总结今天学到的 3 个重点。'],
      ['boss', 'hard', '完成一个实战小作品', '用所学知识完成一个可展示的小 Demo。']
    ],
    npc: ['知识副本已经开启，勇者先从最小的一步开始。', '今天的任务不求完美，但求推进。', '把复杂知识拆小，你就已经赢了一半。']
  },
  健身: {
    keyword: ['健身', '跑步', '减脂', '增肌', '运动', '体重'],
    tasks: [
      ['main', 'normal', '制定训练计划', '确定本周训练频率、动作和休息安排。'],
      ['side', 'easy', '记录身体初始状态', '记录体重、围度或今日运动感受。'],
      ['daily', 'easy', '完成 15 分钟热身', '进行动态拉伸和基础激活。'],
      ['daily', 'normal', '完成一次正式训练', '完成跑步、力量或核心训练。'],
      ['boss', 'hard', '完成周挑战', '完成一次比平时更高强度的挑战。']
    ],
    npc: ['体能副本开启，稳住节奏比冲太猛更重要。', '今天动起来就是胜利。', '你的角色正在一点点变强。']
  },
  阅读: {
    keyword: ['阅读', '读书', '书籍', '小说'],
    tasks: [
      ['main', 'normal', '确定阅读清单', '选择一本主读书和一本备用书。'],
      ['side', 'easy', '建立摘录区域', '准备一个用于摘录金句和观点的笔记。'],
      ['daily', 'easy', '阅读 10 页', '完成至少 10 页阅读，不追求速度。'],
      ['daily', 'normal', '写 100 字读后感', '记录今天最触动你的一个观点。'],
      ['boss', 'hard', '完成整本书复盘', '整理书籍结构、核心观点和个人启发。']
    ],
    npc: ['阅读副本已解锁，慢慢读也算前进。', '每一页都是经验值。', '今天的你正在和更大的世界对话。']
  },
  创作: {
    keyword: ['写作', '创作', '视频', '自媒体', '绘画', '设计'],
    tasks: [
      ['main', 'normal', '确定创作主题', '明确作品主题、受众和表达风格。'],
      ['side', 'easy', '收集灵感素材', '收集 5 个参考案例或灵感片段。'],
      ['daily', 'easy', '完成 15 分钟自由创作', '先产出草稿，不急着修改。'],
      ['daily', 'normal', '打磨一个作品片段', '优化标题、开头或关键画面。'],
      ['boss', 'hard', '发布一个完整作品', '完成并公开发布一个小作品。']
    ],
    npc: ['创作副本开启，先允许自己写得不完美。', '灵感不会等人，先记录下来。', '完成比完美更能升级。']
  },
  生活: {
    keyword: ['早睡', '自律', '整理', '生活', '习惯', '时间'],
    tasks: [
      ['main', 'normal', '建立习惯规则', '定义一个清晰、可执行的生活习惯。'],
      ['side', 'easy', '清理一个干扰源', '移除一个容易打断你的环境因素。'],
      ['daily', 'easy', '完成一次 10 分钟整理', '整理桌面、书包或待办清单。'],
      ['daily', 'normal', '执行今日核心习惯', '完成今天最重要的一项习惯动作。'],
      ['boss', 'hard', '完成 3 天连续挑战', '连续 3 天执行同一个关键习惯。']
    ],
    npc: ['生活副本不靠爆发，靠每天一点点稳定输出。', '小习惯也是大装备。', '今天完成一件事，就已经在变强。']
  }
};

export function createAiService(database) {
  return {
    generateTasks(userId, goal) {
      const category = pickCategory(goal);
      const template = templates[category];
      const tasks = template.tasks.map(([type, difficulty, title, description]) => ({
        type,
        difficulty,
        title: `${title}：${goal.title}`,
        description,
        xpReward: xpByDifficulty(difficulty)
      }));
      const npcMessage = template.npc[Math.floor(Math.random() * template.npc.length)];
      const result = {
        provider: 'local-template',
        category,
        npcMessage,
        tasks
      };

      database
        .prepare('INSERT INTO ai_logs (userId, input, output, model) VALUES (?, ?, ?, ?)')
        .run(userId, JSON.stringify(goal), JSON.stringify(result), 'local-template-v1');

      return result;
    },

    listLogs(userId) {
      return database
        .prepare('SELECT * FROM ai_logs WHERE userId = ? ORDER BY createdAt DESC, id DESC LIMIT 20')
        .all(userId);
    }
  };
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
