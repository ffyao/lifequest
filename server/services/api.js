import { readJson, requireNumber, sendJson } from './httpUtils.js';

export async function handleApiRequest(request, response, context) {
  if (request.method === 'OPTIONS') {
    sendJson(response, 200, { ok: true });
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = url.pathname;
  const method = request.method || 'GET';
  const getCurrentUser = () => context.userService.authenticateRequest(request);
  const getCurrentUserId = () => getCurrentUser().id;

  try {
    if (method === 'POST' && pathname === '/api/auth/register') {
      const result = context.userService.register(await readJson(request));
      sendJson(response, 201, result);
      return;
    }

    if (method === 'POST' && pathname === '/api/auth/login') {
      const result = context.userService.login(await readJson(request));
      sendJson(response, 200, result);
      return;
    }

    if (method === 'GET' && pathname === '/api/auth/me') {
      const user = getCurrentUser();
      sendJson(response, 200, { user });
      return;
    }

    if (method === 'POST' && pathname === '/api/auth/logout') {
      const result = context.userService.logout(request);
      sendJson(response, 200, result);
      return;
    }

    if (method === 'GET' && pathname === '/api/admin/activation-codes') {
      context.userService.requireAdmin(request);
      const activationCodes = context.userService.listActivationCodes();
      sendJson(response, 200, activationCodes);
      return;
    }

    if (method === 'POST' && pathname === '/api/admin/activation-codes') {
      const admin = context.userService.requireAdmin(request);
      const activationCode = context.userService.createActivationCode(admin.id, await readJson(request));
      const activationCodes = context.userService.listActivationCodes();
      sendJson(response, 201, { activationCode, ...activationCodes });
      return;
    }

    if (method === 'GET' && pathname === '/api/ai/settings') {
      const settings = context.aiService.getSettings(getCurrentUserId());
      sendJson(response, 200, { settings });
      return;
    }

    if (method === 'PUT' && pathname === '/api/ai/settings/deepseek-key') {
      const settings = context.aiService.saveDeepseekApiKey(getCurrentUserId(), (await readJson(request)).apiKey);
      sendJson(response, 200, { settings });
      return;
    }

    if (method === 'GET' && pathname === '/api/character') {
      const character = context.gameService.getCharacter(getCurrentUserId());
      sendJson(response, 200, { character });
      return;
    }

    if ((method === 'POST' || method === 'PUT') && pathname === '/api/character') {
      const result = context.gameService.createOrUpdateCharacter(getCurrentUserId(), await readJson(request));
      sendJson(response, 200, result);
      return;
    }

    if (method === 'GET' && pathname === '/api/goals') {
      const goals = context.goalService.list(getCurrentUserId());
      sendJson(response, 200, { goals });
      return;
    }

    if (method === 'POST' && pathname === '/api/goals') {
      const goal = context.goalService.create(getCurrentUserId(), await readJson(request));
      const unlockedBadges = context.badgeService.evaluate(getCurrentUserId());
      sendJson(response, 201, { goal, unlockedBadges });
      return;
    }

    if (method === 'GET' && /^\/api\/goals\/\d+$/.test(pathname)) {
      const goalId = requireNumber(pathname.split('/').at(-1), 'goalId');
      const goal = context.goalService.find(getCurrentUserId(), goalId);
      sendJson(response, 200, { goal });
      return;
    }

    if (method === 'PUT' && /^\/api\/goals\/\d+$/.test(pathname)) {
      const goalId = requireNumber(pathname.split('/').at(-1), 'goalId');
      const goal = context.goalService.update(getCurrentUserId(), goalId, await readJson(request));
      sendJson(response, 200, { goal });
      return;
    }

    if (method === 'DELETE' && /^\/api\/goals\/\d+$/.test(pathname)) {
      const goalId = requireNumber(pathname.split('/').at(-1), 'goalId');
      const result = context.goalService.remove(getCurrentUserId(), goalId);
      sendJson(response, 200, result);
      return;
    }

    if (method === 'GET' && pathname === '/api/tasks') {
      const tasks = context.taskService.list(getCurrentUserId());
      sendJson(response, 200, { tasks });
      return;
    }

    if (method === 'POST' && pathname === '/api/tasks/generate') {
      const userId = getCurrentUserId();
      const body = await readJson(request);
      let goal;
      let createdGoal = false;
      try {
        goal = body.goalId
          ? context.goalService.find(userId, requireNumber(body.goalId, 'goalId'))
          : context.goalService.create(userId, body.goal || body);
        createdGoal = !body.goalId;
        const result = await context.taskService.generate(userId, goal, {
          deepseekApiKey: body.deepseekApiKey
        });
        const unlockedBadges = context.badgeService.evaluate(userId);
        sendJson(response, 201, { goal, ...result, unlockedBadges });
      } catch (error) {
        if (createdGoal && goal?.id) {
          context.goalService.remove(userId, goal.id);
        }
        throw error;
      }
      return;
    }

    if (method === 'PUT' && /^\/api\/tasks\/\d+$/.test(pathname)) {
      const taskId = requireNumber(pathname.split('/').at(-1), 'taskId');
      const task = context.taskService.update(getCurrentUserId(), taskId, await readJson(request));
      sendJson(response, 200, { task });
      return;
    }

    if (method === 'PATCH' && /^\/api\/tasks\/\d+\/complete$/.test(pathname)) {
      const taskId = requireNumber(pathname.split('/').at(-2), 'taskId');
      const result = context.taskService.complete(getCurrentUserId(), taskId);
      sendJson(response, 200, result);
      return;
    }

    if (method === 'DELETE' && /^\/api\/tasks\/\d+$/.test(pathname)) {
      const taskId = requireNumber(pathname.split('/').at(-1), 'taskId');
      const result = context.taskService.remove(getCurrentUserId(), taskId);
      sendJson(response, 200, result);
      return;
    }

    if (method === 'GET' && pathname === '/api/badges') {
      const badges = context.badgeService.listAll();
      const userBadges = context.badgeService.listUserBadges(getCurrentUserId());
      sendJson(response, 200, { badges, userBadges });
      return;
    }

    if (method === 'GET' && pathname === '/api/ranking') {
      const ranking = context.gameService.getRanking();
      sendJson(response, 200, { ranking });
      return;
    }

    if (method === 'GET' && pathname === '/api/ai/logs') {
      const logs = context.aiService.listLogs(getCurrentUserId());
      sendJson(response, 200, { logs });
      return;
    }

    sendJson(response, 404, { error: 'NOT_FOUND', message: '接口不存在' });
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error.code || 'REQUEST_FAILED',
      message: error instanceof Error ? error.message : '请求处理失败'
    });
  }
}
