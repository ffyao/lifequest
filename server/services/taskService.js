export function createTaskService(database, gameService, aiService) {
  return {
    list(userId) {
      return database
        .prepare('SELECT * FROM tasks WHERE userId = ? ORDER BY status ASC, createdAt DESC, id DESC')
        .all(userId);
    },

    generate(userId, goal) {
      const aiResult = aiService.generateTasks(userId, goal);
      const insert = database.prepare(`
        INSERT INTO tasks (userId, goalId, title, description, type, difficulty, xpReward, status, dueDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const dueDate = new Date().toISOString().slice(0, 10);
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

      return {
        npcMessage: aiResult.npcMessage,
        provider: aiResult.provider,
        category: aiResult.category,
        tasks
      };
    },

    complete(userId, taskId) {
      return gameService.completeTask(userId, taskId);
    },

    remove(userId, taskId) {
      const result = database.prepare('DELETE FROM tasks WHERE userId = ? AND id = ?').run(userId, taskId);
      return { deleted: result.changes > 0 };
    }
  };
}
