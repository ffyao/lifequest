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
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL UNIQUE,
      nickname TEXT NOT NULL,
      career TEXT NOT NULL,
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

  const characterCount = database.prepare('SELECT COUNT(*) AS count FROM characters').get().count;
  if (characterCount === 0) {
    const createCharacter = database.prepare(`
      INSERT INTO characters (userId, nickname, career, level, xp, coins, streakDays)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    createCharacter.run(demoUser.id, '晨星勇者', '学习者', 2, 160, 30, 2);
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
      ['首次启程', '创建人生角色，正式进入 LifeQuest 世界。', '🚀', 'character_created', 1],
      ['目标制定者', '创建第一个长期目标。', '🎯', 'goal_created', 1],
      ['副本挑战者', '完成第一个副本任务。', '⚔️', 'task_completed', 1],
      ['连击达人', '连续完成 3 天任务。', '🔥', 'streak_days', 3],
      ['主线推进者', '完成 3 个主线任务。', '📜', 'main_completed', 3],
      ['Boss 击破者', '完成 1 个 Boss 难度任务。', '👑', 'boss_completed', 1],
      ['经验收集者', '累计获得 300 XP。', '💎', 'xp_total', 300],
      ['成长冒险家', '角色等级达到 5 级。', '🌟', 'level_reached', 5]
    ].forEach((badge) => createBadge.run(...badge));
  }

  const demoGoals = database.prepare('SELECT COUNT(*) AS count FROM goals WHERE userId = ?').get(demoUser.id).count;
  if (demoGoals === 0) {
    const createGoal = database.prepare(`
      INSERT INTO goals (userId, title, description, category, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = createGoal.run(demoUser.id, '30 天掌握 Vue 项目开发', '完成 Vue 基础、组件通信和一个完整项目。', '学习', 'active');
    const goalId = Number(result.lastInsertRowid);
    const createTask = database.prepare(`
      INSERT INTO tasks (userId, goalId, title, description, type, difficulty, xpReward, status, dueDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    createTask.run(demoUser.id, goalId, '建立 Vue 基础知识地图', '整理 Vue 响应式、组件和路由的核心概念。', 'main', 'normal', 40, 'todo', today());
    createTask.run(demoUser.id, goalId, '完成组件通信小练习', '写一个父子组件传值示例。', 'daily', 'easy', 20, 'todo', today());
  }

  awardInitialBadges(database, demoUser.id);
}

function awardInitialBadges(database, userId) {
  const badges = database.prepare('SELECT id, conditionType FROM badges WHERE conditionType IN (?, ?)').all('character_created', 'goal_created');
  const insertBadge = database.prepare('INSERT OR IGNORE INTO user_badges (userId, badgeId) VALUES (?, ?)');
  for (const badge of badges) {
    insertBadge.run(userId, badge.id);
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
