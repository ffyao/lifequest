import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const rootDir = fileURLToPath(new URL('../..', import.meta.url));
const databasePath = join(rootDir, 'server', 'data', 'lifequest.sqlite');
const defaultAdminUsername = 'admin';
const defaultAdminPassword = 'admin123456';

export function initializeDatabase() {
  mkdirSync(dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath);
  database.exec('PRAGMA foreign_keys = ON');
  migrate(database);
  seed(database);
  return database;
}

function migrate(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      userId INTEGER PRIMARY KEY,
      deepseekApiKey TEXT,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activation_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK (type IN ('normal', 'advanced')),
      remainingUses INTEGER NOT NULL,
      maxUses INTEGER NOT NULL,
      createdBy INTEGER,
      usedBy INTEGER,
      usedAt TEXT,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (usedBy) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL UNIQUE,
      nickname TEXT NOT NULL,
      career TEXT NOT NULL,
      avatar TEXT NOT NULL DEFAULT '',
      level INTEGER NOT NULL DEFAULT 1,
      xp INTEGER NOT NULL DEFAULT 0,
      coins INTEGER NOT NULL DEFAULT 0,
      streakDays INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '学习',
      status TEXT NOT NULL DEFAULT 'active',
      completedAt TEXT,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      goalId INTEGER,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      xpReward INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'todo',
      dueDate TEXT,
      completedAt TEXT,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (goalId) REFERENCES goals(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS task_daily_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      taskId INTEGER NOT NULL,
      completedDate TEXT NOT NULL,
      xpGained INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (userId, taskId, completedDate),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      conditionType TEXT NOT NULL,
      conditionValue INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      badgeId INTEGER NOT NULL,
      unlockedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (userId, badgeId),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (badgeId) REFERENCES badges(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS friendships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      friendId INTEGER NOT NULL,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (userId, friendId),
      CHECK (userId <> friendId),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (friendId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      input TEXT NOT NULL,
      output TEXT NOT NULL,
      model TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  ensureColumn(database, 'users', 'role', "TEXT NOT NULL DEFAULT 'user'");
  ensureColumn(database, 'sessions', 'expiresAt', 'TEXT');
  ensureColumn(database, 'goals', 'completedAt', 'TEXT');
  ensureColumn(database, 'characters', 'avatar', "TEXT NOT NULL DEFAULT ''");
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_friendships_user_friend ON friendships(userId, friendId);
    CREATE INDEX IF NOT EXISTS idx_characters_ranking ON characters(xp DESC, level DESC, id ASC);
  `);
  database.exec("UPDATE sessions SET expiresAt = datetime(createdAt, '+7 days') WHERE expiresAt IS NULL");
  database.exec(`
    INSERT OR IGNORE INTO task_daily_completions (userId, taskId, completedDate, xpGained, createdAt)
    SELECT userId, id, substr(completedAt, 1, 10), xpReward, completedAt
    FROM tasks
    WHERE type = 'daily' AND status = 'done' AND completedAt IS NOT NULL;

    UPDATE tasks
    SET status = 'todo', completedAt = NULL
    WHERE type = 'daily' AND status = 'done';

    UPDATE badges
    SET description = '立下第一个目标，为勇者指明前行的方向。'
    WHERE name = '目标制定者'
      AND description = '立下第一个长期目标，为勇者指明前行的方向。';
  `);
}

function seed(database) {
  removeDefaultSampleUsers(database);

  const adminConfig = getSeedAdminConfig();
  const adminUser = ensureSeedUser(database, adminConfig.username, adminConfig.password, 'admin');

  ensureSeedActivationCode(database, {
    code: 'LIFEQUEST-ADV-300',
    type: 'advanced',
    remainingUses: 300,
    maxUses: 300,
    createdBy: adminUser.id
  });

  const badgeCount = database.prepare('SELECT COUNT(*) AS count FROM badges').get().count;
  if (badgeCount === 0) {
    const createBadge = database.prepare(`
      INSERT INTO badges (name, description, icon, conditionType, conditionValue)
      VALUES (?, ?, ?, ?, ?)
    `);
    [
      ['首次启程', '创建人生角色，正式踏入 LifeQuest 副本世界，冒险从此刻开始。', 'rocket', 'character_created', 1],
      ['目标制定者', '立下第一个目标，为勇者指明前行的方向。', 'target', 'goal_created', 1],
      ['副本挑战者', '完成第一个副本任务，证明你有执行力的勇气。', 'sword', 'task_completed', 1],
      ['连击达人', '连续 3 天完成任务，连击之光在你身上燃烧。', 'flame', 'streak_days', 3],
      ['主线推进者', '完成 3 个主线任务，主线剧情因你而向前推进。', 'scroll', 'main_completed', 3],
      ['Boss 击破者', '击败 1 个 Boss 难度任务，你的实力已被副本认可。', 'crown', 'boss_completed', 1],
      ['经验收集者', '累计获得 300 XP，经验宝石在你手中不断积累。', 'gem', 'xp_total', 300],
      ['成长冒险家', '角色等级达到 5 级，你已成为真正的成长冒险家。', 'star', 'level_reached', 5]
    ].forEach((badge) => createBadge.run(...badge));
  }

  normalizeBadgeIcons(database);
}

function getSeedAdminConfig() {
  return {
    username: normalizeSeedCredential(process.env.LIFEQUEST_ADMIN_USERNAME, defaultAdminUsername),
    password: normalizeSeedCredential(process.env.LIFEQUEST_ADMIN_PASSWORD, defaultAdminPassword)
  };
}

function normalizeSeedCredential(value, fallback) {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function removeDefaultSampleUsers(database) {
  const sampleUsers = [
    ['demo', 'demo123'],
    ['alice', 'alice123'],
    ['bob', 'bob123']
  ];

  const deleteUser = database.prepare('DELETE FROM users WHERE username = ? AND password = ? AND role = ?');
  for (const [username, password] of sampleUsers) {
    deleteUser.run(username, password, 'user');
  }
}

function ensureColumn(database, tableName, columnName, definition) {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all();
  if (columns.some((column) => column.name === columnName)) {
    return;
  }
  database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

function ensureSeedUser(database, username, password, role) {
  const existing = database
    .prepare('SELECT id, username, role FROM users WHERE username = ?')
    .get(username);
  if (existing) {
    database.prepare('UPDATE users SET password = ?, role = ? WHERE id = ?').run(password, role, existing.id);
    return { ...existing, role };
  }

  const result = database
    .prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')
    .run(username, password, role);
  return { id: Number(result.lastInsertRowid), username, role };
}

function ensureSeedActivationCode(database, { code, type, remainingUses, maxUses, createdBy }) {
  const existing = database.prepare('SELECT id FROM activation_codes WHERE code = ?').get(code);
  if (existing) {
    return;
  }

  database
    .prepare(`
      INSERT INTO activation_codes (code, type, remainingUses, maxUses, createdBy)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(code, type, remainingUses, maxUses, createdBy);
}

function normalizeBadgeIcons(database) {
  database.exec(`
    UPDATE badges
    SET icon = CASE conditionType
      WHEN 'character_created' THEN 'rocket'
      WHEN 'goal_created' THEN 'target'
      WHEN 'task_completed' THEN 'sword'
      WHEN 'streak_days' THEN 'flame'
      WHEN 'main_completed' THEN 'scroll'
      WHEN 'boss_completed' THEN 'crown'
      WHEN 'xp_total' THEN 'gem'
      WHEN 'level_reached' THEN 'star'
      ELSE icon
    END
  `);
}
