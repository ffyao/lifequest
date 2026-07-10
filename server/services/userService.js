import { randomBytes } from 'node:crypto';

const NORMAL_CODE_USES = 1;
const ADVANCED_CODE_USES = 300;
const SESSION_TTL_DAYS = 7;

export function createUserService(database) {
  return {
    register({ username, password, activationCode }) {
      validateCredentials(username, password);
      const normalizedUsername = String(username).trim();
      const normalizedCode = normalizeActivationCode(activationCode);

      if (findByUsername(database, normalizedUsername)) {
        const error = new Error('用户名已存在');
        error.statusCode = 409;
        error.code = 'USERNAME_EXISTS';
        throw error;
      }

      database.exec('BEGIN IMMEDIATE');
      try {
        const activation = findValidActivationCode(database, normalizedCode);
        if (!activation) {
          throwActivationError();
        }

        const result = database
          .prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')
          .run(normalizedUsername, password, 'user');
        const userId = Number(result.lastInsertRowid);

        consumeActivationCode(database, activation, userId);
        ensureCharacter(database, userId, normalizedUsername);
        const user = selectPublicUser(database, userId);
        const token = createSession(database, user.id);

        database.exec('COMMIT');
        return { user, token };
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },

    login({ username, password }) {
      validateCredentials(username, password);
      const user = database
        .prepare('SELECT id, username, role, createdAt FROM users WHERE username = ? AND password = ?')
        .get(String(username).trim(), password);

      if (!user) {
        const error = new Error('用户名或密码错误');
        error.statusCode = 401;
        error.code = 'LOGIN_FAILED';
        throw error;
      }

      ensureCharacter(database, user.id, user.username);
      return { user, token: createSession(database, user.id) };
    },

    findById(id) {
      const user = selectPublicUser(database, id);
      if (!user) {
        const error = new Error('用户不存在');
        error.statusCode = 404;
        error.code = 'USER_NOT_FOUND';
        throw error;
      }
      return user;
    },

    authenticateRequest(request) {
      const token = getBearerToken(request);
      if (!token) {
        const error = new Error('请先登录后再使用系统');
        error.statusCode = 401;
        error.code = 'UNAUTHORIZED';
        throw error;
      }

      const session = database
        .prepare(`
          SELECT users.id, users.username, users.role, users.createdAt
          FROM sessions
          JOIN users ON users.id = sessions.userId
          WHERE sessions.token = ? AND sessions.expiresAt > CURRENT_TIMESTAMP
        `)
        .get(token);

      if (!session) {
        const error = new Error('登录状态已失效，请重新登录');
        error.statusCode = 401;
        error.code = 'SESSION_EXPIRED';
        throw error;
      }

      return session;
    },

    logout(request) {
      const token = getBearerToken(request);
      if (!token) {
        return { ok: true };
      }

      database.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      return { ok: true };
    },

    requireAdmin(request) {
      const user = this.authenticateRequest(request);
      if (user.role !== 'admin') {
        const error = new Error('只有管理员可以管理激活码');
        error.statusCode = 403;
        error.code = 'ADMIN_REQUIRED';
        throw error;
      }
      return user;
    },

    createActivationCode(adminUserId, { type }) {
      const normalizedType = normalizeActivationType(type);
      const maxUses = normalizedType === 'advanced' ? ADVANCED_CODE_USES : NORMAL_CODE_USES;
      const code = generateUniqueActivationCode(database, normalizedType);

      database
        .prepare(`
          INSERT INTO activation_codes (code, type, remainingUses, maxUses, createdBy)
          VALUES (?, ?, ?, ?, ?)
        `)
        .run(code, normalizedType, maxUses, maxUses, adminUserId);

      return findActivationCodeByCode(database, code);
    },

    listActivationCodes() {
      const advancedCodes = database
        .prepare(`
          SELECT id, code, type, remainingUses, maxUses, createdAt
          FROM activation_codes
          WHERE type = 'advanced' AND remainingUses > 0
          ORDER BY createdAt DESC, id DESC
        `)
        .all();

      const normalCodes = database
        .prepare(`
          SELECT id, code, type, remainingUses, maxUses, createdAt
          FROM activation_codes
          WHERE type = 'normal' AND remainingUses > 0
          ORDER BY createdAt DESC, id DESC
        `)
        .all();

      return { advancedCodes, normalCodes };
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

function normalizeActivationCode(activationCode) {
  const normalizedCode = String(activationCode || '').trim().toUpperCase();
  if (!normalizedCode) {
    const error = new Error('注册账号需要有效激活码');
    error.statusCode = 400;
    error.code = 'ACTIVATION_CODE_REQUIRED';
    throw error;
  }
  return normalizedCode;
}

function normalizeActivationType(type) {
  const normalizedType = String(type || 'normal').trim();
  if (!['normal', 'advanced'].includes(normalizedType)) {
    const error = new Error('激活码类型必须是 normal 或 advanced');
    error.statusCode = 400;
    error.code = 'INVALID_ACTIVATION_TYPE';
    throw error;
  }
  return normalizedType;
}

function findByUsername(database, username) {
  return database.prepare('SELECT id FROM users WHERE username = ?').get(username);
}

function selectPublicUser(database, id) {
  return database
    .prepare('SELECT id, username, role, createdAt FROM users WHERE id = ?')
    .get(id);
}

function findValidActivationCode(database, code) {
  return database
    .prepare(`
      SELECT id, code, type, remainingUses, maxUses
      FROM activation_codes
      WHERE code = ? AND remainingUses > 0
    `)
    .get(code);
}

function findActivationCodeByCode(database, code) {
  return database
    .prepare(`
      SELECT id, code, type, remainingUses, maxUses, createdAt
      FROM activation_codes
      WHERE code = ?
    `)
    .get(code);
}

function consumeActivationCode(database, activation, userId) {
  const result = database
    .prepare(`
      UPDATE activation_codes
      SET remainingUses = remainingUses - 1,
          usedBy = CASE WHEN type = 'normal' THEN ? ELSE usedBy END,
          usedAt = CASE WHEN type = 'normal' THEN CURRENT_TIMESTAMP ELSE usedAt END
      WHERE id = ? AND remainingUses > 0
    `)
    .run(userId, activation.id);

  if (result.changes === 0) {
    throwActivationError();
  }
}

function throwActivationError() {
  const error = new Error('激活码无效或已被使用');
  error.statusCode = 400;
  error.code = 'INVALID_ACTIVATION_CODE';
  throw error;
}

function createSession(database, userId) {
  const token = randomBytes(32).toString('hex');
  database
    .prepare(`
      INSERT INTO sessions (userId, token, expiresAt)
      VALUES (?, ?, datetime('now', '+${SESSION_TTL_DAYS} days'))
    `)
    .run(userId, token);
  return token;
}

function getBearerToken(request) {
  const authorization = request.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');
  if (scheme?.toLowerCase() === 'bearer' && token) {
    return token.trim();
  }
  return '';
}

function generateUniqueActivationCode(database, type) {
  const prefix = type === 'advanced' ? 'ADV' : 'LQ';
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const raw = randomBytes(6).toString('hex').toUpperCase();
    const code = `${prefix}-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
    const existing = database.prepare('SELECT id FROM activation_codes WHERE code = ?').get(code);
    if (!existing) {
      return code;
    }
  }

  const error = new Error('生成激活码失败，请重试');
  error.statusCode = 500;
  error.code = 'ACTIVATION_CODE_GENERATE_FAILED';
  throw error;
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
