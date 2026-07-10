export function createTaskService(database, gameService, aiService) {
  return {
    list(userId) {
      return database
        .prepare('SELECT * FROM tasks WHERE userId = ? ORDER BY status ASC, createdAt DESC, id DESC')
        .all(userId);
    },

    async generate(userId, goal, options = {}) {
      const aiResult = await aiService.generateTasks(userId, goal, options);
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

        if (options.deepseekApiKey) {
          aiService.saveDeepseekApiKey(userId, options.deepseekApiKey);
        }
        aiService.recordGeneration(userId, goal, aiResult);

        database.exec('COMMIT');

        return {
          npcMessage: aiResult.npcMessage,
          provider: aiResult.provider,
          model: aiResult.model,
          category: aiResult.category,
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
