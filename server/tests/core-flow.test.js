import assert from 'node:assert/strict';
import { initializeDatabase } from '../services/database.js';
import { createAppContext } from '../services/appContext.js';

const database = initializeDatabase();
const context = createAppContext(database);
const suffix = Date.now();

const user = context.userService.register({
  username: `tester-${suffix}`,
  password: 'test1234'
});

context.gameService.createOrUpdateCharacter(user.id, {
  nickname: '测试勇者',
  career: '学习者'
});

const goal = context.goalService.create(user.id, {
  title: '14 天完成 JavaScript 基础复习',
  description: '复习语法、函数、数组和 DOM 操作。',
  category: '学习'
});

const generated = context.taskService.generate(user.id, goal);
assert.equal(generated.tasks.length, 5);
assert.ok(generated.tasks.every((task) => task.status === 'todo'));

const before = context.gameService.getCharacter(user.id);
const completed = context.taskService.complete(user.id, generated.tasks[0].id);
assert.equal(completed.task.status, 'done');
assert.ok(completed.character.xp > before.xp);
assert.ok(completed.character.level >= before.level);

const userBadges = context.badgeService.listUserBadges(user.id);
assert.ok(userBadges.length >= 2);

console.log('核心流程测试通过：注册 → 创建角色 → 创建目标 → 生成任务 → 完成任务 → XP/徽章更新');
