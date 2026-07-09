export function createUserService(database) {
  return {
    register({ username, password }) {
      validateCredentials(username, password);
      try {
        const result = database
          .prepare('INSERT INTO users (username, password) VALUES (?, ?)')
          .run(username.trim(), password);
        const user = this.findById(Number(result.lastInsertRowid));
        ensureCharacter(database, user.id, user.username);
        return user;
      } catch {
        const error = new Error('用户名已存在');
        error.statusCode = 409;
        error.code = 'USERNAME_EXISTS';
        throw error;
      }
    },

    login({ username, password }) {
      validateCredentials(username, password);
      const user = database
        .prepare('SELECT id, username, createdAt FROM users WHERE username = ? AND password = ?')
        .get(username.trim(), password);

      if (!user) {
        const error = new Error('用户名或密码错误');
        error.statusCode = 401;
        error.code = 'LOGIN_FAILED';
        throw error;
      }

      ensureCharacter(database, user.id, username);
      return user;
    },

    findById(id) {
      const user = database.prepare('SELECT id, username, createdAt FROM users WHERE id = ?').get(id);
      if (!user) {
        const error = new Error('用户不存在');
        error.statusCode = 404;
        error.code = 'USER_NOT_FOUND';
        throw error;
      }
      return user;
    }
  };
}

function validateCredentials(username, password) {
  if (!username || String(username).trim().length < 2) {
    const error = new Error('用户名至少需要 2 个字符');
    error.statusCode = 400;
    error.code = 'INVALID_USERNAME';
    throw error;
  }

  if (!password || String(password).length < 6) {
    const error = new Error('密码至少需要 6 个字符');
    error.statusCode = 400;
    error.code = 'INVALID_PASSWORD';
    throw error;
  }
}

function ensureCharacter(database, userId, username) {
  const existing = database.prepare('SELECT id FROM characters WHERE userId = ?').get(userId);
  if (existing) {
    return;
  }

  database
    .prepare('INSERT INTO characters (userId, nickname, career) VALUES (?, ?, ?)')
    .run(userId, `${username}的勇者`, '学习者');
}
