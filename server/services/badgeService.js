export function createBadgeService(database) {
  return {
    listAll() {
      return database.prepare('SELECT * FROM badges ORDER BY id ASC').all();
    },

    listUserBadges(userId) {
      return database
        .prepare(`
          SELECT b.*, ub.unlockedAt
          FROM badges b
          JOIN user_badges ub ON ub.badgeId = b.id
          WHERE ub.userId = ?
          ORDER BY ub.unlockedAt DESC, b.id ASC
        `)
        .all(userId);
    },

    evaluate(userId) {
      const badges = this.listAll();
      const unlocked = [];
      const insert = database.prepare('INSERT OR IGNORE INTO user_badges (userId, badgeId) VALUES (?, ?)');

      for (const badge of badges) {
        if (isBadgeUnlocked(database, userId, badge)) {
          const result = insert.run(userId, badge.id);
          if (result.changes > 0) {
            unlocked.push(badge);
          }
        }
      }

      return unlocked;
    }
  };
}

function isBadgeUnlocked(database, userId, badge) {
  switch (badge.conditionType) {
    case 'character_created':
      return count(database, 'characters', 'userId = ?', [userId]) >= badge.conditionValue;
    case 'goal_created':
      return count(database, 'goals', 'userId = ?', [userId]) >= badge.conditionValue;
    case 'task_completed':
      return countTaskCompletions(database, userId) >= badge.conditionValue;
    case 'streak_days': {
      const character = database.prepare('SELECT streakDays FROM characters WHERE userId = ?').get(userId);
      return Number(character?.streakDays || 0) >= badge.conditionValue;
    }
    case 'main_completed':
      return count(database, 'tasks', 'userId = ? AND status = ? AND type = ?', [userId, 'done', 'main']) >= badge.conditionValue;
    case 'boss_completed':
      return count(database, 'tasks', 'userId = ? AND status = ? AND difficulty = ?', [userId, 'done', 'boss']) >= badge.conditionValue;
    case 'xp_total': {
      const character = database.prepare('SELECT xp FROM characters WHERE userId = ?').get(userId);
      return Number(character?.xp || 0) >= badge.conditionValue;
    }
    case 'level_reached': {
      const character = database.prepare('SELECT level FROM characters WHERE userId = ?').get(userId);
      return Number(character?.level || 0) >= badge.conditionValue;
    }
    default:
      return false;
  }
}

function count(database, tableName, whereClause, params) {
  return database.prepare(`SELECT COUNT(*) AS count FROM ${tableName} WHERE ${whereClause}`).get(...params).count;
}

function countTaskCompletions(database, userId) {
  const doneTasks = count(database, 'tasks', 'userId = ? AND status = ?', [userId, 'done']);
  const dailyCompletions = count(database, 'task_daily_completions', 'userId = ?', [userId]);
  return doneTasks + dailyCompletions;
}
