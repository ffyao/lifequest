export function createGameService(database, badgeService) {
  return {
    getCharacter(userId) {
      const character = database.prepare('SELECT * FROM characters WHERE userId = ?').get(userId);
      if (!character) {
        const error = new Error('角色不存在');
        error.statusCode = 404;
        error.code = 'CHARACTER_NOT_FOUND';
        throw error;
      }
      return character;
    },

    createOrUpdateCharacter(userId, input) {
      const nickname = String(input.nickname || '').trim();
      const career = String(input.career || '学习者').trim();

      if (nickname.length < 2) {
        const error = new Error('角色昵称至少需要 2 个字符');
        error.statusCode = 400;
        error.code = 'INVALID_NICKNAME';
        throw error;
      }

      const existing = database.prepare('SELECT id FROM characters WHERE userId = ?').get(userId);
      if (existing) {
        database.prepare('UPDATE characters SET nickname = ?, career = ? WHERE userId = ?').run(nickname, career, userId);
      } else {
        database.prepare('INSERT INTO characters (userId, nickname, career) VALUES (?, ?, ?)').run(userId, nickname, career);
      }

      const unlockedBadges = badgeService.evaluate(userId);
      return {
        character: this.getCharacter(userId),
        unlockedBadges
      };
    },

    completeTask(userId, taskId) {
      database.exec('BEGIN IMMEDIATE');
      try {
        const task = database.prepare('SELECT * FROM tasks WHERE userId = ? AND id = ?').get(userId, taskId);
        if (!task) {
          const error = new Error('任务不存在');
          error.statusCode = 404;
          error.code = 'TASK_NOT_FOUND';
          throw error;
        }

        const goal = getGoalByTask(database, userId, task);
        const completedGoal = evaluateGoalCompletion(database, userId, task.goalId);
        if (completedGoal?.status === 'done') {
          const character = getCharacterByUserId(database, userId);
          database.exec('COMMIT');
          return {
            task: withDailyState(database, userId, task),
            goal: completedGoal,
            character,
            unlockedBadges: [],
            xpGained: 0
          };
        }

        if (task.type === 'daily') {
          const completedDate = today();
          const completedToday = database
            .prepare('SELECT id FROM task_daily_completions WHERE userId = ? AND taskId = ? AND completedDate = ?')
            .get(userId, taskId, completedDate);

          if (completedToday) {
            const character = getCharacterByUserId(database, userId);
            database.exec('COMMIT');
            return {
              task: withDailyState(database, userId, task),
              goal,
              character,
              unlockedBadges: [],
              xpGained: 0
            };
          }

          database
            .prepare(`
              INSERT INTO task_daily_completions (userId, taskId, completedDate, xpGained)
              VALUES (?, ?, ?, ?)
            `)
            .run(userId, taskId, completedDate, task.xpReward);

          const character = getCharacterByUserId(database, userId);
          const updatedCharacter = applyReward(database, userId, character, task.xpReward);
          const unlockedBadges = badgeService.evaluate(userId);

          database.exec('COMMIT');

          return {
            task: withDailyState(database, userId, task),
            goal,
            character: updatedCharacter,
            unlockedBadges,
            xpGained: task.xpReward
          };
        }

        if (task.status === 'done') {
          const character = getCharacterByUserId(database, userId);
          database.exec('COMMIT');
          return {
            task,
            goal,
            character,
            unlockedBadges: [],
            xpGained: 0
          };
        }

        const completeResult = database
          .prepare("UPDATE tasks SET status = 'done', completedAt = datetime('now', 'localtime') WHERE id = ? AND userId = ? AND status != 'done'")
          .run(taskId, userId);

        if (completeResult.changes === 0) {
          const currentTask = database.prepare('SELECT * FROM tasks WHERE userId = ? AND id = ?').get(userId, taskId);
          const character = getCharacterByUserId(database, userId);
          database.exec('COMMIT');
          return {
            task: currentTask,
            goal,
            character,
            unlockedBadges: [],
            xpGained: 0
          };
        }

        const character = getCharacterByUserId(database, userId);
        applyReward(database, userId, character, task.xpReward);
        const updatedGoal = evaluateGoalCompletion(database, userId, task.goalId);
        const unlockedBadges = badgeService.evaluate(userId);
        const updatedTask = database.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
        const updatedCharacter = getCharacterByUserId(database, userId);

        database.exec('COMMIT');

        return {
          task: updatedTask,
          goal: updatedGoal || goal,
          character: updatedCharacter,
          unlockedBadges,
          xpGained: task.xpReward
        };
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },

    getRanking() {
      return database
        .prepare(`
          SELECT
            ROW_NUMBER() OVER (ORDER BY c.xp DESC, c.level DESC, c.id ASC) AS rank,
            u.username,
            c.nickname,
            c.career,
            c.level,
            c.xp
          FROM characters c
          JOIN users u ON u.id = c.userId
          ORDER BY c.xp DESC, c.level DESC, c.id ASC
          LIMIT 20
        `)
        .all();
    }
  };
}

export function calculateLevel(xp) {
  return Math.floor(Number(xp || 0) / 100) + 1;
}

function getCharacterByUserId(database, userId) {
  const character = database.prepare('SELECT * FROM characters WHERE userId = ?').get(userId);
  if (!character) {
    const error = new Error('角色不存在');
    error.statusCode = 404;
    error.code = 'CHARACTER_NOT_FOUND';
    throw error;
  }
  return character;
}

function getGoalByTask(database, userId, task) {
  if (!task.goalId) {
    return null;
  }
  return database.prepare('SELECT * FROM goals WHERE userId = ? AND id = ?').get(userId, task.goalId) || null;
}

function withDailyState(database, userId, task) {
  if (task.type !== 'daily') {
    return task;
  }

  const completedToday = Boolean(database
    .prepare('SELECT id FROM task_daily_completions WHERE userId = ? AND taskId = ? AND completedDate = ?')
    .get(userId, task.id, today()));
  return { ...task, completedToday };
}

function applyReward(database, userId, character, xpReward) {
  const newXp = Number(character.xp || 0) + Number(xpReward || 0);
  const newLevel = calculateLevel(newXp);
  const newCoins = Number(character.coins || 0) + Math.max(5, Math.floor(Number(xpReward || 0) / 4));
  const newStreak = Math.max(Number(character.streakDays || 0), calculateStreak(database, userId));

  database
    .prepare('UPDATE characters SET xp = ?, level = ?, coins = ?, streakDays = ? WHERE userId = ?')
    .run(newXp, newLevel, newCoins, newStreak, userId);

  return getCharacterByUserId(database, userId);
}

function evaluateGoalCompletion(database, userId, goalId) {
  if (!goalId) {
    return null;
  }

  const goal = database.prepare('SELECT * FROM goals WHERE userId = ? AND id = ?').get(userId, goalId);
  if (!goal) {
    return null;
  }
  if (goal.status === 'done') {
    return goal;
  }

  const required = database
    .prepare(`
      SELECT type, status
      FROM tasks
      WHERE userId = ? AND goalId = ? AND type IN ('main', 'boss')
    `)
    .all(userId, goalId);

  const hasMain = required.some(task => task.type === 'main');
  const hasBoss = required.some(task => task.type === 'boss');
  if (!hasMain || !hasBoss || required.some(task => task.status !== 'done')) {
    return goal;
  }

  database
    .prepare("UPDATE goals SET status = 'done', completedAt = datetime('now', 'localtime') WHERE userId = ? AND id = ?")
    .run(userId, goalId);

  return database.prepare('SELECT * FROM goals WHERE userId = ? AND id = ?').get(userId, goalId);
}

function calculateStreak(database, userId) {
  const rows = database
    .prepare(`
      SELECT day
      FROM (
        SELECT DISTINCT substr(completedAt, 1, 10) AS day
        FROM tasks
        WHERE userId = ? AND status = 'done' AND completedAt IS NOT NULL
        UNION
        SELECT DISTINCT completedDate AS day
        FROM task_daily_completions
        WHERE userId = ?
      )
      WHERE day IS NOT NULL
      ORDER BY day DESC
      LIMIT 30
    `)
    .all(userId, userId);

  if (rows.length === 0) {
    return 0;
  }

  let streak = 0;
  const currentDay = new Date();

  for (const row of rows) {
    const expectedDay = toLocalDate(currentDay);
    if (row.day !== expectedDay) {
      break;
    }
    streak += 1;
    currentDay.setDate(currentDay.getDate() - 1);
  }

  return streak;
}

function today() {
  return toLocalDate(new Date());
}

function toLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
