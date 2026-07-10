import { getUserId, readJson, requireNumber, sendJson } from './httpUtils.js';

export async function handleApiRequest(request, response, context) {
  if (request.method === 'OPTIONS') {
    sendJson(response, 200, { ok: true });
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = url.pathname;
  const method = request.method || 'GET';

  try {
    if (method === 'POST' && pathname === '/api/auth/register') {
      const user = context.userService.register(await readJson(request));
      sendJson(response, 201, { user });
      return;
    }

    if (method === 'POST' && pathname === '/api/auth/login') {
      const user = context.userService.login(await readJson(request));
      sendJson(response, 200, { user });
      return;
    }

    if (method === 'GET' && pathname === '/api/auth/me') {
      const user = context.userService.findById(getUserId(request));
      sendJson(response, 200, { user });
      return;
    }

    if (method === 'GET' && pathname === '/api/character') {
      const character = context.gameService.getCharacter(getUserId(request));
      sendJson(response, 200, { character });
      return;
    }

    if ((method === 'POST' || method === 'PUT') && pathname === '/api/character') {
      const result = context.gameService.createOrUpdateCharacter(getUserId(request), await readJson(request));
      sendJson(response, 200, result);
      return;
    }

    if (method === 'GET' && pathname === '/api/goals') {
      const goals = context.goalService.list(getUserId(request));
      sendJson(response, 200, { goals });
      return;
    }

    if (method === 'POST' && pathname === '/api/goals') {
      const goal = context.goalService.create(getUserId(request), await readJson(request));
      const unlockedBadges = context.badgeService.evaluate(getUserId(request));
      sendJson(response, 201, { goal, unlockedBadges });
      return;
    }

    if (method === 'GET' && /^\/api\/goals\/\d+$/.test(pathname)) {
      const goalId = requireNumber(pathname.split('/').at(-1), 'goalId');
      const goal = context.goalService.find(getUserId(request), goalId);
      sendJson(response, 200, { goal });
      return;
    }

    if (method === 'PUT' && /^\/api\/goals\/\d+$/.test(pathname)) {
      const goalId = requireNumber(pathname.split('/').at(-1), 'goalId');
      const goal = context.goalService.update(getUserId(request), goalId, await readJson(request));
      sendJson(response, 200, { goal });
      return;
    }

    if (method === 'DELETE' && /^\/api\/goals\/\d+$/.test(pathname)) {
      const goalId = requireNumber(pathname.split('/').at(-1), 'goalId');
      const result = context.goalService.remove(getUserId(request), goalId);
      sendJson(response, 200, result);
      return;
    }

    if (method === 'GET' && pathname === '/api/tasks') {
      const tasks = context.taskService.list(getUserId(request));
      sendJson(response, 200, { tasks });
      return;
    }

    if (method === 'POST' && pathname === '/api/tasks/generate') {
      const userId = getUserId(request);
      const body = await readJson(request);
      const goal = body.goalId
        ? context.goalService.find(userId, requireNumber(body.goalId, 'goalId'))
        : context.goalService.create(userId, body.goal || body);
      const result = context.taskService.generate(userId, goal);
      const unlockedBadges = context.badgeService.evaluate(userId);
      sendJson(response, 201, { goal, ...result, unlockedBadges });
      return;
    }

    if (method === 'PUT' && /^\/api\/tasks\/\d+$/.test(pathname)) {
      const taskId = requireNumber(pathname.split('/').at(-1), 'taskId');
      const task = context.taskService.update(getUserId(request), taskId, await readJson(request));
      sendJson(response, 200, { task });
      return;
    }

    if (method === 'PATCH' && /^\/api\/tasks\/\d+\/complete$/.test(pathname)) {
      const taskId = requireNumber(pathname.split('/').at(-2), 'taskId');
      const result = context.taskService.complete(getUserId(request), taskId);
      sendJson(response, 200, result);
      return;
    }

    if (method === 'DELETE' && /^\/api\/tasks\/\d+$/.test(pathname)) {
      const taskId = requireNumber(pathname.split('/').at(-1), 'taskId');
      const result = context.taskService.remove(getUserId(request), taskId);
      sendJson(response, 200, result);
      return;
    }

    if (method === 'GET' && pathname === '/api/badges') {
      const badges = context.badgeService.listAll();
      const userBadges = context.badgeService.listUserBadges(getUserId(request));
      sendJson(response, 200, { badges, userBadges });
      return;
    }

    if (method === 'GET' && pathname === '/api/ranking') {
      const ranking = context.gameService.getRanking();
      sendJson(response, 200, { ranking });
      return;
    }

    if (method === 'GET' && pathname === '/api/ai/logs') {
      const logs = context.aiService.listLogs(getUserId(request));
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
