import { createAiService } from './aiService.js';
import { createBadgeService } from './badgeService.js';
import { createGameService } from './gameService.js';
import { createGoalService } from './goalService.js';
import { createTaskService } from './taskService.js';
import { createUserService } from './userService.js';

export function createAppContext(database) {
  const userService = createUserService(database);
  const goalService = createGoalService(database);
  const badgeService = createBadgeService(database);
  const gameService = createGameService(database, badgeService);
  const aiService = createAiService(database);
  const taskService = createTaskService(database, gameService, aiService);

  return {
    database,
    userService,
    goalService,
    badgeService,
    gameService,
    aiService,
    taskService
  };
}
