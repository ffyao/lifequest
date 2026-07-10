import assert from 'node:assert/strict';
import { initializeDatabase } from '../services/database.js';
import { createAppContext } from '../services/appContext.js';
import { handleApiRequest } from '../services/api.js';

let deepseekRequestCount = 0;
const deepseekAuthorizations = [];
const deepseekSystemPrompts = [];
const deepseekResponseQueue = [];

globalThis.fetch = async (url, options = {}) => {
  deepseekRequestCount += 1;
  assert.equal(url, 'https://api.deepseek.com/chat/completions');
  const body = JSON.parse(options.body);
  assert.equal(body.model, 'deepseek-v4-flash');
  assert.equal(body.response_format.type, 'json_object');
  assert.equal(body.thinking.type, 'disabled');
  assert.equal(body.stream, false);
  assert.ok(body.messages[0].content.includes('tasks 必须返回 3 到 6 个任务'));
  assert.ok(body.messages[0].content.includes('短期目标、一次性目标、冲刺型目标允许不生成 daily'));
  assert.ok(body.messages[0].content.includes('side 为可选类型'));
  assert.ok(body.messages[0].content.includes('xpReward 由你根据任务行动成本、难度和目标价值自行决定'));
  assert.ok(body.messages[0].content.includes('不得写成“任务内容：任务名称”'));
  assert.ok(body.messages[0].content.includes('不要使用高频模板标题'));
  assert.equal(options.headers.Authorization, 'Bearer sk-test-deepseek-key');
  deepseekAuthorizations.push(options.headers.Authorization);
  deepseekSystemPrompts.push(body.messages[0].content);
  const responsePayload = deepseekResponseQueue.shift() || {
    npcMessage: 'DeepSeek 已为你开启本次人生副本。',
    tasks: [
      { type: 'main', difficulty: 'normal', title: '拆解学习路线', description: '列出本次复习的知识模块和每日推进顺序。', xpReward: 45 },
      { type: 'daily', difficulty: 'easy', title: '完成专注学习', description: '完成一次二十五分钟无打断学习并记录结果。', xpReward: 18 },
      { type: 'daily', difficulty: 'normal', title: '输出学习笔记', description: '用自己的语言总结今天最关键的三个知识点。', xpReward: 28 },
      { type: 'boss', difficulty: 'boss', title: '完成综合演练', description: '用本次复习内容完成一个可检查的小练习。', xpReward: 130 }
    ]
  };

  return {
    ok: true,
    status: 200,
    async json() {
      return {
        choices: [
          {
            message: {
              content: JSON.stringify(responsePayload)
            }
          }
        ]
      };
    }
  };
};

const database = initializeDatabase();
const context = createAppContext(database);
const suffix = Date.now();
const previousDeepseekSetting = database
  .prepare('SELECT value FROM app_settings WHERE key = ?')
  .get('deepseekApiKey');
database.prepare('DELETE FROM app_settings WHERE key = ?').run('deepseekApiKey');
process.on('exit', () => {
  if (previousDeepseekSetting) {
    database
      .prepare(`
        INSERT INTO app_settings (key, value, updatedAt)
        VALUES ('deepseekApiKey', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = CURRENT_TIMESTAMP
      `)
      .run(previousDeepseekSetting.value);
  } else {
    database.prepare('DELETE FROM app_settings WHERE key = ?').run('deepseekApiKey');
  }
});

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
assert.equal(context.userService.authenticateRequest(authRequest(registered.token)).id, user.id);
const sessionWindow = database
  .prepare('SELECT julianday(expiresAt) - julianday(createdAt) AS days FROM sessions WHERE token = ?')
  .get(registered.token);
assert.ok(sessionWindow.days >= 6.9 && sessionWindow.days <= 7.1);
assert.deepEqual(context.userService.logout(authRequest(registered.token)), { ok: true });
assert.throws(
  () => context.userService.authenticateRequest(authRequest(registered.token)),
  (error) => error.code === 'SESSION_EXPIRED' && error.statusCode === 401
);

const expiringLogin = context.userService.login({
  username: `tester-${suffix}`,
  password: 'test1234'
});
database.prepare("UPDATE sessions SET expiresAt = datetime('now', '-1 minute') WHERE token = ?").run(expiringLogin.token);
assert.throws(
  () => context.userService.authenticateRequest(authRequest(expiringLogin.token)),
  (error) => error.code === 'SESSION_EXPIRED' && error.statusCode === 401
);

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

console.log('认证测试通过：注册需激活码、普通码一次性、高级码递减、管理员可生成和查看激活码、会话注销和过期生效');

context.gameService.createOrUpdateCharacter(user.id, {
  nickname: '测试勇者',
  career: '学习者'
});

const avatarImage = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4TAYAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
const updatedProfile = context.gameService.createOrUpdateCharacter(user.id, {
  nickname: '测试勇者',
  career: '学习者',
  avatar: avatarImage
});
assert.equal(updatedProfile.character.nickname, '测试勇者');
assert.equal(updatedProfile.character.avatar, avatarImage);

const profileRankingRow = context.gameService.getRanking().find((item) => item.username === user.username);
assert.ok(profileRankingRow);
assert.equal(profileRankingRow.avatar, avatarImage);
assert.equal(profileRankingRow.username, user.username);
assert.equal(Object.hasOwn(profileRankingRow, 'signature'), false);

const profileLogin = context.userService.login({
  username: user.username,
  password: 'test1234'
});
const apiAvatarImage = 'data:image/png;base64,iVBORw0KGgo=';
const profileResponse = await invokeApi('PUT', '/api/profile', profileLogin.token, { avatar: apiAvatarImage });
assert.equal(profileResponse.statusCode, 200);
assert.equal(profileResponse.payload.user.username, user.username);
assert.equal(profileResponse.payload.character.avatar, apiAvatarImage);
assert.equal(context.userService.findById(user.id).username, user.username);
assert.equal(context.gameService.getRanking().find((item) => item.username === user.username).avatar, apiAvatarImage);

assert.throws(
  () => context.gameService.createOrUpdateCharacter(user.id, {
    nickname: '测试勇者',
    career: '学习者',
    avatar: 'ABCDE'
  }),
  (error) => error.code === 'INVALID_AVATAR' && error.statusCode === 400
);

assert.throws(
  () => context.gameService.createOrUpdateCharacter(user.id, {
    nickname: '测试勇者',
    career: '学习者',
    avatar: `data:image/webp;base64,${'A'.repeat(220001)}`
  }),
  (error) => error.code === 'INVALID_AVATAR' && error.statusCode === 400
);

console.log('头像测试通过：图片头像可保存并同步到排行榜，排行榜用户名保持注册用户名');

const goal = context.goalService.create(user.id, {
  title: '14 天完成 JavaScript 基础复习',
  description: '复习语法、函数、数组和 DOM 操作。',
  category: '学习'
});

assert.equal(context.aiService.getSettings().deepseekKeyConfigured, false);
await assert.rejects(
  () => context.taskService.generate(user.id, goal),
  (error) => error.code === 'DEEPSEEK_API_KEY_REQUIRED' && error.statusCode === 400
);

const userKeyResponse = await invokeApi('PUT', '/api/admin/ai/deepseek-key', profileLogin.token, {
  apiKey: 'sk-user-should-not-work'
});
assert.equal(userKeyResponse.statusCode, 403);

const adminKeyResponse = await invokeApi('PUT', '/api/admin/ai/deepseek-key', adminLogin.token, {
  apiKey: 'sk-test-deepseek-key'
});
assert.equal(adminKeyResponse.statusCode, 200);
assert.equal(adminKeyResponse.payload.settings.deepseekKeyConfigured, true);
assert.equal(adminKeyResponse.payload.settings.managedBy, 'admin');
assert.equal(context.aiService.getSettings().deepseekKeyConfigured, true);
const aiSettingsResponse = await invokeApi('GET', '/api/ai/settings', profileLogin.token);
assert.equal(aiSettingsResponse.statusCode, 200);
assert.equal(aiSettingsResponse.payload.settings.deepseekKeyConfigured, true);
assert.equal(aiSettingsResponse.payload.settings.managedBy, 'admin');

const generated = await context.taskService.generate(user.id, goal);
assert.equal(generated.tasks.length, 4);
assert.equal(generated.provider, 'deepseek');
assert.equal(generated.model, 'deepseek-v4-flash');
assert.ok(generated.tasks.every((task) => task.status === 'todo'));
assert.equal(generated.tasks.some((task) => task.type === 'side'), false);
assert.deepEqual(generated.tasks.map((task) => task.xpReward), [45, 18, 28, 130]);
assert.equal(deepseekRequestCount, 1);

const secondGoal = context.goalService.create(user.id, {
  title: '7 天完成算法基础训练',
  description: '每天练习数组、字符串和递归题目。',
  category: '学习'
});
const generatedWithSavedKey = await context.taskService.generate(user.id, secondGoal);
assert.equal(generatedWithSavedKey.tasks.length, 4);
assert.equal(deepseekRequestCount, 2);
assert.deepEqual(deepseekAuthorizations, ['Bearer sk-test-deepseek-key', 'Bearer sk-test-deepseek-key']);

const listedGoals = context.goalService.list(user.id);
assert.equal(listedGoals[0].id, secondGoal.id, '目标列表应按时间倒序返回，最新目标在最上方');
assert.equal(generated.tasks.every((task) => task.goalId === goal.id), true);
assert.equal(generatedWithSavedKey.tasks.every((task) => task.goalId === secondGoal.id), true);

const shortTermGoal = context.goalService.create(user.id, {
  title: '周末完成作品集首页草稿',
  description: '两天内整理内容并完成一个可展示的首页草稿。',
  category: '创作'
});
deepseekResponseQueue.push({
  npcMessage: 'DeepSeek 已按短期冲刺目标生成一次性挑战。',
  tasks: [
    { type: 'main', difficulty: 'normal', title: '定下首页内容骨架', description: '写出首页必须展示的栏目、作品和联系方式。', xpReward: 40 },
    { type: 'side', difficulty: 'easy', title: '挑选五个代表作品', description: '从现有材料中选出最能说明能力的五个作品。', xpReward: 25 },
    { type: 'boss', difficulty: 'boss', title: '交付首页可视草稿', description: '完成一个能直接展示给同学查看的首页草稿。', xpReward: 120 }
  ]
});
const generatedShortTerm = await context.taskService.generate(user.id, shortTermGoal);
assert.equal(generatedShortTerm.tasks.length, 3);
assert.equal(generatedShortTerm.tasks.some((task) => task.type === 'daily'), false);
assert.deepEqual(generatedShortTerm.tasks.map((task) => task.xpReward), [40, 25, 120]);

const retryGoal = context.goalService.create(user.id, {
  title: '10 天完成 CSS 布局复盘',
  description: '复盘 Flex、Grid 和响应式布局。',
  category: '学习'
});
deepseekResponseQueue.push(
  {
    npcMessage: '第一次生成包含模板化标题。',
    tasks: [
      { type: 'main', difficulty: 'normal', title: '主线任务：绘制知识地图', description: '整理布局相关概念。', xpReward: 45 },
      { type: 'daily', difficulty: 'easy', title: '完成专注学习', description: '完成一次布局练习。', xpReward: 18 },
      { type: 'boss', difficulty: 'boss', title: '完成实战小目标', description: '做一个响应式页面。', xpReward: 120 }
    ]
  },
  {
    npcMessage: 'DeepSeek 已重新生成更贴合目标的任务。',
    tasks: [
      { type: 'main', difficulty: 'normal', title: '拆开 Flex 对齐盲区', description: '用三个横纵对齐例子确认自己对主轴和交叉轴的理解。', xpReward: 48 },
      { type: 'daily', difficulty: 'easy', title: '复盘一个卡片布局', description: '每天选一个卡片区域，说明它适合 Flex 还是 Grid。', xpReward: 16 },
      { type: 'boss', difficulty: 'boss', title: '搭出响应式作品页', description: '完成一个桌面端和移动端都能正常阅读的作品展示页。', xpReward: 135 }
    ]
  }
);
const retryStartCount = deepseekRequestCount;
const generatedAfterRetry = await context.taskService.generate(user.id, retryGoal);
assert.equal(deepseekRequestCount, retryStartCount + 2);
assert.equal(generatedAfterRetry.tasks[0].title, '拆开 Flex 对齐盲区');
assert.ok(deepseekSystemPrompts.at(-1).includes('上一次生成未通过后端校验'));

const before = context.gameService.getCharacter(user.id);
const completed = context.taskService.complete(user.id, generated.tasks[0].id);
assert.equal(completed.task.status, 'done');
assert.ok(completed.character.xp > before.xp);
assert.ok(completed.character.level >= before.level);
assert.equal(completed.xpGained, generated.tasks[0].xpReward);

const completedAgain = context.taskService.complete(user.id, generated.tasks[0].id);
assert.equal(completedAgain.xpGained, 0);
assert.equal(completedAgain.character.xp, completed.character.xp);

const dailyTask = generated.tasks.find((task) => task.type === 'daily');
const dailyBefore = context.gameService.getCharacter(user.id);
const completedDaily = context.taskService.complete(user.id, dailyTask.id);
assert.equal(completedDaily.task.status, 'todo');
assert.equal(completedDaily.task.completedToday, true);
assert.equal(completedDaily.xpGained, dailyTask.xpReward);

const completedDailyAgain = context.taskService.complete(user.id, dailyTask.id);
assert.equal(completedDailyAgain.xpGained, 0);
assert.equal(completedDailyAgain.character.xp, completedDaily.character.xp);
const listedDailyTask = context.taskService.list(user.id).find((task) => task.id === dailyTask.id);
assert.equal(listedDailyTask.status, 'todo');
assert.equal(listedDailyTask.completedToday, true);
assert.ok(completedDaily.character.xp > dailyBefore.xp);

const bossTask = generated.tasks.find((task) => task.type === 'boss');
const completedBoss = context.taskService.complete(user.id, bossTask.id);
assert.equal(completedBoss.task.status, 'done');
assert.equal(completedBoss.goal.status, 'done');
assert.ok(completedBoss.goal.completedAt);
const completedAfterGoalDone = context.taskService.complete(user.id, dailyTask.id);
assert.equal(completedAfterGoalDone.xpGained, 0);
assert.equal(completedAfterGoalDone.goal.status, 'done');

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

function authRequest(token) {
  return {
    headers: {
      authorization: `Bearer ${token}`
    }
  };
}

async function invokeApi(method, url, token, body) {
  const chunks = body === undefined ? [] : [Buffer.from(JSON.stringify(body))];
  const request = {
    method,
    url,
    headers: {
      host: 'localhost:3000',
      authorization: `Bearer ${token}`
    },
    async *[Symbol.asyncIterator]() {
      yield* chunks;
    }
  };
  const response = {
    statusCode: 0,
    headers: {},
    body: '',
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(payload) {
      this.body = String(payload || '');
    }
  };

  await handleApiRequest(request, response, context);
  return {
    statusCode: response.statusCode,
    payload: response.body ? JSON.parse(response.body) : null
  };
}
