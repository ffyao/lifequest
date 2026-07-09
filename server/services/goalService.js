export function createGoalService(database) {
  return {
    list(userId) {
      return database
        .prepare('SELECT * FROM goals WHERE userId = ? ORDER BY createdAt DESC, id DESC')
        .all(userId);
    },

    create(userId, input) {
      if (!input.title || String(input.title).trim().length < 2) {
        const error = new Error('目标标题至少需要 2 个字符');
        error.statusCode = 400;
        error.code = 'INVALID_GOAL_TITLE';
        throw error;
      }

      const result = database
        .prepare(`
          INSERT INTO goals (userId, title, description, category, status)
          VALUES (?, ?, ?, ?, ?)
        `)
        .run(
          userId,
          String(input.title).trim(),
          String(input.description || '').trim(),
          String(input.category || '学习').trim(),
          'active'
        );

      return this.find(userId, Number(result.lastInsertRowid));
    },

    find(userId, goalId) {
      const goal = database.prepare('SELECT * FROM goals WHERE userId = ? AND id = ?').get(userId, goalId);
      if (!goal) {
        const error = new Error('目标不存在');
        error.statusCode = 404;
        error.code = 'GOAL_NOT_FOUND';
        throw error;
      }
      return goal;
    }
  };
}
