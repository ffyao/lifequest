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

        if (task.status === 'done') {
          const character = getCharacterByUserId(database, userId);
          database.exec('COMMIT');
          return {
            task,
            character,
            unlockedBadges: [],
            xpGained: 0
          };
        }

        const completeResult = database
          .prepare("UPDATE tasks SET status = 'done', completedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ? AND status != 'done'")
          .run(taskId, userId);

        if (completeResult.changes === 0) {
          const currentTask = database.prepare('SELECT * FROM tasks WHERE userId = ? AND id = ?').get(userId, taskId);
          const character = getCharacterByUserId(database, userId);
          database.exec('COMMIT');
          return {
            task: currentTask,
            character,
            unlockedBadges: [],
            xpGained: 0
          };
        }

        const character = getCharacterByUserId(database, userId);
        const newXp = character.xp + task.xpReward;
        const newLevel = calculateLevel(newXp);
        const newCoins = character.coins + Math.max(5, Math.floor(task.xpReward / 4));
        const newStreak = Math.max(character.streakDays, calculateStreak(database, userId));

        database
          .prepare('UPDATE characters SET xp = ?, level = ?, coins = ?, streakDays = ? WHERE userId = ?')
          .run(newXp, newLevel, newCoins, newStreak, userId);

        const unlockedBadges = badgeService.evaluate(userId);
        const updatedTask = database.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
        const updatedCharacter = getCharacterByUserId(database, userId);

        database.exec('COMMIT');

        return {
          task: updatedTask,
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

function calculateStreak(database, userId) {
  const rows = database
    .prepare(`
      SELECT DISTINCT substr(completedAt, 1, 10) AS day
      FROM tasks
      WHERE userId = ? AND status = 'done' AND completedAt IS NOT NULL
      ORDER BY day DESC
      LIMIT 30
    `)
    .all(userId);

  if (rows.length === 0) {
    return 0;
  }

  let streak = 0;
  const currentDay = new Date();

  for (const row of rows) {
    const expectedDay = currentDay.toISOString().slice(0, 10);
    if (row.day !== expectedDay) {
      break;
    }
    streak += 1;
    currentDay.setUTCDate(currentDay.getUTCDate() - 1);
  }

  return streak;
}
