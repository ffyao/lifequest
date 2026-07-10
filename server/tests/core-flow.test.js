import assert from 'node:assert/strict';
import { initializeDatabase } from '../services/database.js';
import { createAppContext } from '../services/appContext.js';

const database = initializeDatabase();
const context = createAppContext(database);
const suffix = Date.now();

const adminLogin = context.userService.login({
  username: 'admin',
  password: 'admin123456'
});
assert.equal(adminLogin.user.role, 'admin');
assert.ok(adminLogin.token);

assert.throws(
  () => context.userService.register({
    username: `no-code-${suffix}`,
    password: 'test1234'
  }),
  (error) => error.code === 'ACTIVATION_CODE_REQUIRED' && error.statusCode === 400
);

const normalCode = context.userService.createActivationCode(adminLogin.user.id, { type: 'normal' });
const registered = context.userService.register({
  username: `tester-${suffix}`,
  password: 'test1234',
  activationCode: normalCode.code
});
const user = registered.user;
assert.ok(registered.token);

assert.throws(
  () => context.userService.register({
    username: `reuse-code-${suffix}`,
    password: 'test1234',
    activationCode: normalCode.code
  }),
  (error) => error.code === 'INVALID_ACTIVATION_CODE' && error.statusCode === 400
);

const advancedCode = context.userService.createActivationCode(adminLogin.user.id, { type: 'advanced' });
const advancedBefore = advancedCode.remainingUses;
const advancedUser = context.userService.register({
  username: `advanced-${suffix}`,
  password: 'test1234',
  activationCode: advancedCode.code
});
assert.ok(advancedUser.token);
const activationCodes = context.userService.listActivationCodes();
const advancedAfter = activationCodes.advancedCodes.find((code) => code.code === advancedCode.code);
assert.equal(advancedAfter.remainingUses, advancedBefore - 1);
assert.ok(activationCodes.normalCodes.every((code) => code.code !== normalCode.code));

console.log('认证测试通过：注册需激活码、普通码一次性、高级码递减、管理员可生成和查看激活码');

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
assert.equal(completed.xpGained, generated.tasks[0].xpReward);

const completedAgain = context.taskService.complete(user.id, generated.tasks[0].id);
assert.equal(completedAgain.xpGained, 0);
assert.equal(completedAgain.character.xp, completed.character.xp);

const userBadges = context.badgeService.listUserBadges(user.id);
assert.ok(userBadges.length >= 2);

console.log('核心流程测试通过：注册 → 创建角色 → 创建目标 → 生成任务 → 完成任务 → XP/徽章更新');

// ===== B1: 目标更新接口测试 =====
const updatedGoal = context.goalService.update(user.id, goal.id, {
  title: '30 天掌握 Vue 项目开发',
  description: '完成基础语法、组件通信和项目实战。',
  category: '学习',
  status: 'active'
});
assert.equal(updatedGoal.id, goal.id);
assert.equal(updatedGoal.title, '30 天掌握 Vue 项目开发');
assert.equal(updatedGoal.description, '完成基础语法、组件通信和项目实战。');

// 标题为空应抛出错误
assert.throws(
  () => context.goalService.update(user.id, goal.id, { title: 'a' }),
  (error) => error.code === 'INVALID_GOAL_TITLE' && error.statusCode === 400
);

// 部分更新：只改 status
const partialGoal = context.goalService.update(user.id, goal.id, { status: 'paused' });
assert.equal(partialGoal.status, 'paused');
assert.equal(partialGoal.title, '30 天掌握 Vue 项目开发');

// 不能更新别人的目标
assert.throws(
  () => context.goalService.update(999999, goal.id, { title: '恶意修改' }),
  (error) => error.code === 'GOAL_NOT_FOUND' && error.statusCode === 404
);

console.log('B1 测试通过：目标更新接口（含标题校验、部分更新、权限隔离）');

// ===== B3: 任务编辑接口测试 =====
const taskToUpdate = generated.tasks[1];
const updatedTask = context.taskService.update(user.id, taskToUpdate.id, {
  title: '更新后的任务标题',
  description: '更新后的任务说明',
  difficulty: 'hard',
  dueDate: '2026-07-10'
});
assert.equal(updatedTask.id, taskToUpdate.id);
assert.equal(updatedTask.title, '更新后的任务标题');
assert.equal(updatedTask.description, '更新后的任务说明');
assert.equal(updatedTask.difficulty, 'hard');
assert.equal(updatedTask.dueDate, '2026-07-10');

// 不允许通过 update 修改 xpReward / status / completedAt
const originalXp = taskToUpdate.xpReward;
const originalStatus = taskToUpdate.status;
const tampered = context.taskService.update(user.id, taskToUpdate.id, {
  title: '尝试篡改',
  xpReward: 9999,
  status: 'done',
  completedAt: '2026-01-01 00:00:00'
});
assert.equal(tampered.xpReward, originalXp);
assert.equal(tampered.status, originalStatus);
assert.equal(tampered.completedAt, null);

// 无效难度应抛出错误
assert.throws(
  () => context.taskService.update(user.id, taskToUpdate.id, { difficulty: 'impossible' }),
  (error) => error.code === 'INVALID_DIFFICULTY' && error.statusCode === 400
);

// 标题过短应抛出错误
assert.throws(
  () => context.taskService.update(user.id, taskToUpdate.id, { title: 'a' }),
  (error) => error.code === 'INVALID_TASK_TITLE' && error.statusCode === 400
);

// 不能修改别人的任务
assert.throws(
  () => context.taskService.update(999999, taskToUpdate.id, { title: '恶意修改' }),
  (error) => error.code === 'TASK_NOT_FOUND' && error.statusCode === 404
);

console.log('B3 测试通过：任务编辑接口（含字段保护、难度校验、权限隔离）');

// ===== B2: 目标删除接口测试 =====
// 删除单个任务
const taskToDelete = generated.tasks[2];
const deleteTaskResult = context.taskService.remove(user.id, taskToDelete.id);
assert.equal(deleteTaskResult.deleted, true);
const tasksAfterDelete = context.taskService.list(user.id);
assert.ok(tasksAfterDelete.every((t) => t.id !== taskToDelete.id));

assert.throws(
  () => context.taskService.remove(user.id, taskToDelete.id),
  (error) => error.code === 'TASK_NOT_FOUND' && error.statusCode === 404
);

// 删除目标后，关联任务的 goalId 应被设为 NULL（ON DELETE SET NULL）
const remainingTaskId = generated.tasks[3].id;
const goalDeleteResult = context.goalService.remove(user.id, goal.id);
assert.equal(goalDeleteResult.deleted, true);

const remainingTask = context.taskService.list(user.id).find((t) => t.id === remainingTaskId);
assert.ok(remainingTask, '剩余任务应仍存在');
assert.equal(remainingTask.goalId, null, '删除目标后关联任务 goalId 应为 NULL');

// 删除已删除的目标应抛出 404
assert.throws(
  () => context.goalService.remove(user.id, goal.id),
  (error) => error.code === 'GOAL_NOT_FOUND' && error.statusCode === 404
);

// 不能删除别人的目标
assert.throws(
  () => context.goalService.remove(999999, goal.id),
  (error) => error.code === 'GOAL_NOT_FOUND' && error.statusCode === 404
);

console.log('B2 测试通过：目标删除接口（含任务 goalId 置空、权限隔离）');

console.log('全部测试通过：核心流程 + 目标更新/删除 + 任务编辑 + 权限隔离');
