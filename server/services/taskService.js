const GENERATION_COOLDOWN_SECONDS = 10;
const DAILY_GENERATION_LIMIT = 30;

export function createTaskService(database, gameService, aiService) {
  return {
    list(userId) {
      const tasks = database
        .prepare('SELECT * FROM tasks WHERE userId = ? ORDER BY status ASC, createdAt DESC, id DESC')
        .all(userId);
      const completedTodayRows = database
        .prepare('SELECT taskId FROM task_daily_completions WHERE userId = ? AND completedDate = ?')
        .all(userId, today());
      const completedTodayIds = new Set(completedTodayRows.map(row => Number(row.taskId)));

      return tasks.map(task => ({
        ...task,
        completedToday: task.type === 'daily' && completedTodayIds.has(Number(task.id))
      }));
    },

    getGenerationLimit(userId) {
      return getGenerationLimit(database, userId);
    },

    async generate(userId, goal) {
      if (!aiService.getSettings().deepseekKeyConfigured) {
        const error = new Error('管理员尚未配置 DeepSeek API Key，请联系管理员');
        error.statusCode = 400;
        error.code = 'DEEPSEEK_API_KEY_REQUIRED';
        throw error;
      }

      const generationLimit = reserveGenerationRequest(database, userId);
      const aiResult = await aiService.generateTasks(userId, goal);
      const insert = database.prepare(`
        INSERT INTO tasks (userId, goalId, title, description, type, difficulty, xpReward, status, dueDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const dueDate = new Date().toISOString().slice(0, 10);

      database.exec('BEGIN IMMEDIATE');
      try {
        const tasks = aiResult.tasks.map((task) => {
          const result = insert.run(
            userId,
            goal.id,
            task.title,
            task.description,
            task.type,
            task.difficulty,
            task.xpReward,
            'todo',
            dueDate
          );
          return database.prepare('SELECT * FROM tasks WHERE id = ?').get(Number(result.lastInsertRowid));
        });

        aiService.recordGeneration(userId, goal, aiResult);

        database.exec('COMMIT');

        return {
          npcMessage: aiResult.npcMessage,
          provider: aiResult.provider,
          model: aiResult.model,
          category: aiResult.category,
          generationLimit,
          tasks
        };
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },

    update(userId, taskId, input) {
      const task = database.prepare('SELECT * FROM tasks WHERE userId = ? AND id = ?').get(userId, taskId);
      if (!task) {
        const error = new Error('任务不存在');
        error.statusCode = 404;
        error.code = 'TASK_NOT_FOUND';
        throw error;
      }

      const fields = [];
      const values = [];

      if (input.title !== undefined) {
        const title = String(input.title).trim();
        if (title.length < 2) {
          const error = new Error('任务标题至少需要 2 个字符');
          error.statusCode = 400;
          error.code = 'INVALID_TASK_TITLE';
          throw error;
        }
        fields.push('title = ?');
        values.push(title);
      }

      if (input.description !== undefined) {
        fields.push('description = ?');
        values.push(String(input.description).trim());
      }

      if (input.difficulty !== undefined) {
        const difficulty = String(input.difficulty).trim();
        const validDifficulties = ['easy', 'normal', 'hard', 'boss'];
        if (!validDifficulties.includes(difficulty)) {
          const error = new Error('任务难度无效');
          error.statusCode = 400;
          error.code = 'INVALID_DIFFICULTY';
          throw error;
        }
        fields.push('difficulty = ?');
        values.push(difficulty);
      }

      if (input.dueDate !== undefined) {
        fields.push('dueDate = ?');
        values.push(String(input.dueDate).trim() || null);
      }

      if (fields.length > 0) {
        values.push(taskId, userId);
        database.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ? AND userId = ?`).run(...values);
      }

      return database.prepare('SELECT * FROM tasks WHERE userId = ? AND id = ?').get(userId, taskId);
    },

    complete(userId, taskId) {
      return gameService.completeTask(userId, taskId);
    },

    remove(userId, taskId) {
      const task = database.prepare('SELECT id FROM tasks WHERE userId = ? AND id = ?').get(userId, taskId);
      if (!task) {
        const error = new Error('任务不存在');
        error.statusCode = 404;
        error.code = 'TASK_NOT_FOUND';
        throw error;
      }

      const result = database.prepare('DELETE FROM tasks WHERE userId = ? AND id = ?').run(userId, taskId);
      return { deleted: result.changes > 0 };
    }
  };
}

function reserveGenerationRequest(database, userId) {
  database.exec('BEGIN IMMEDIATE');
  try {
    const generationLimit = getGenerationLimit(database, userId);
    if (generationLimit.retryAfterSeconds > 0) {
      const error = new Error(`任务生成太频繁，请 ${generationLimit.retryAfterSeconds} 秒后再试`);
      error.statusCode = 429;
      error.code = 'TASK_GENERATION_COOLDOWN';
      error.retryAfterSeconds = generationLimit.retryAfterSeconds;
      database.exec('ROLLBACK');
      throw error;
    }

    if (generationLimit.dailyRemaining <= 0) {
      const error = new Error(`今日任务生成次数已达 ${DAILY_GENERATION_LIMIT} 次，请明天再试`);
      error.statusCode = 429;
      error.code = 'TASK_GENERATION_DAILY_LIMIT';
      error.dailyLimit = DAILY_GENERATION_LIMIT;
      database.exec('ROLLBACK');
      throw error;
    }

    database
      .prepare('INSERT INTO task_generation_requests (userId) VALUES (?)')
      .run(userId);

    database.exec('COMMIT');
    return {
      cooldownSeconds: GENERATION_COOLDOWN_SECONDS,
      dailyLimit: DAILY_GENERATION_LIMIT,
      dailyUsed: generationLimit.dailyUsed + 1,
      dailyRemaining: Math.max(0, generationLimit.dailyRemaining - 1),
      retryAfterSeconds: GENERATION_COOLDOWN_SECONDS,
      canGenerate: false
    };
  } catch (error) {
    try {
      database.exec('ROLLBACK');
    } catch {
      // Transaction was already rolled back before throwing a known limit error.
    }
    throw error;
  }
}

function getGenerationLimit(database, userId) {
  const lastRequest = database
    .prepare(`
      SELECT CAST(strftime('%s', 'now') AS INTEGER) - CAST(strftime('%s', createdAt) AS INTEGER) AS elapsedSeconds
      FROM task_generation_requests
      WHERE userId = ?
      ORDER BY createdAt DESC, id DESC
      LIMIT 1
    `)
    .get(userId);
  const elapsedSeconds = Number(lastRequest?.elapsedSeconds);
  const retryAfterSeconds = Number.isFinite(elapsedSeconds) && elapsedSeconds < GENERATION_COOLDOWN_SECONDS
    ? Math.max(1, GENERATION_COOLDOWN_SECONDS - elapsedSeconds)
    : 0;
  const todayCount = database
    .prepare(`
      SELECT COUNT(*) AS count
      FROM task_generation_requests
      WHERE userId = ?
        AND date(createdAt, 'localtime') = date('now', 'localtime')
    `)
    .get(userId).count;
  const dailyUsed = Number(todayCount || 0);
  const dailyRemaining = Math.max(0, DAILY_GENERATION_LIMIT - dailyUsed);

  return {
    cooldownSeconds: GENERATION_COOLDOWN_SECONDS,
    dailyLimit: DAILY_GENERATION_LIMIT,
    dailyUsed,
    dailyRemaining,
    retryAfterSeconds,
    canGenerate: dailyRemaining > 0 && retryAfterSeconds === 0
  };
}

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
