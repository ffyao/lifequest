import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const rootDir = fileURLToPath(new URL('../..', import.meta.url));
const databasePath = join(rootDir, 'server', 'data', 'lifequest.sqlite');

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
  database.exec("UPDATE sessions SET expiresAt = datetime(createdAt, '+7 days') WHERE expiresAt IS NULL");
  database.exec(`
    INSERT OR IGNORE INTO task_daily_completions (userId, taskId, completedDate, xpGained, createdAt)
    SELECT userId, id, substr(completedAt, 1, 10), xpReward, completedAt
    FROM tasks
    WHERE type = 'daily' AND status = 'done' AND completedAt IS NOT NULL;

    UPDATE tasks
    SET status = 'todo', completedAt = NULL
    WHERE type = 'daily' AND status = 'done';
  `);
}

function seed(database) {
  const userCount = database.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount === 0) {
    const createUser = database.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    createUser.run('demo', 'demo123');
    createUser.run('alice', 'alice123');
    createUser.run('bob', 'bob123');
  }

  const demoUser = database.prepare('SELECT id FROM users WHERE username = ?').get('demo');
  const aliceUser = database.prepare('SELECT id FROM users WHERE username = ?').get('alice');
  const bobUser = database.prepare('SELECT id FROM users WHERE username = ?').get('bob');
  const adminUser = ensureSeedUser(database, 'admin', 'admin123456', 'admin');

  ensureSeedActivationCode(database, {
    code: 'LIFEQUEST-ADV-300',
    type: 'advanced',
    remainingUses: 300,
    maxUses: 300,
    createdBy: adminUser.id
  });

  const characterCount = database.prepare('SELECT COUNT(*) AS count FROM characters').get().count;
  if (characterCount === 0) {
    const createCharacter = database.prepare(`
      INSERT INTO characters (userId, nickname, career, level, xp, coins, streakDays)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    createCharacter.run(demoUser.id, '主角', '学习者', 2, 160, 30, 2);
    createCharacter.run(aliceUser.id, '代码法师', '创作者', 4, 430, 80, 5);
    createCharacter.run(bobUser.id, '健身骑士', '健身者', 3, 280, 55, 3);
  }

  const badgeCount = database.prepare('SELECT COUNT(*) AS count FROM badges').get().count;
  if (badgeCount === 0) {
    const createBadge = database.prepare(`
      INSERT INTO badges (name, description, icon, conditionType, conditionValue)
      VALUES (?, ?, ?, ?, ?)
    `);
    [
      ['首次启程', '创建人生角色，正式踏入 LifeQuest 副本世界，冒险从此刻开始。', 'rocket', 'character_created', 1],
      ['目标制定者', '立下第一个长期目标，为勇者指明前行的方向。', 'target', 'goal_created', 1],
      ['副本挑战者', '完成第一个副本任务，证明你有执行力的勇气。', 'sword', 'task_completed', 1],
      ['连击达人', '连续 3 天完成任务，连击之光在你身上燃烧。', 'flame', 'streak_days', 3],
      ['主线推进者', '完成 3 个主线任务，主线剧情因你而向前推进。', 'scroll', 'main_completed', 3],
      ['Boss 击破者', '击败 1 个 Boss 难度任务，你的实力已被副本认可。', 'crown', 'boss_completed', 1],
      ['经验收集者', '累计获得 300 XP，经验宝石在你手中不断积累。', 'gem', 'xp_total', 300],
      ['成长冒险家', '角色等级达到 5 级，你已成为真正的成长冒险家。', 'star', 'level_reached', 5]
    ].forEach((badge) => createBadge.run(...badge));
  }

  normalizeBadgeIcons(database);

  awardInitialBadges(database, demoUser.id);
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

function awardInitialBadges(database, userId) {
  const badges = database.prepare('SELECT id, conditionType FROM badges WHERE conditionType IN (?, ?)').all('character_created', 'goal_created');
  const insertBadge = database.prepare('INSERT OR IGNORE INTO user_badges (userId, badgeId) VALUES (?, ?)');
  for (const badge of badges) {
    insertBadge.run(userId, badge.id);
  }
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
