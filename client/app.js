// =============================================
// SVG Icon Templates - 图标模板
// =============================================
const ICONS = {
  sword: '<svg class="icon icon-xs"><use href="#i-sword"/></svg>',
  compass: '<svg class="icon icon-xs"><use href="#i-compass"/></svg>',
  calendar: '<svg class="icon icon-xs"><use href="#i-calendar"/></svg>',
  crown: '<svg class="icon icon-xs"><use href="#i-crown"/></svg>',
  trophy: '<svg class="icon icon-md"><use href="#i-trophy"/></svg>',
  medal: '<svg class="icon icon-md"><use href="#i-medal"/></svg>',
  lock: '<svg class="icon icon-md"><use href="#i-lock"/></svg>',
  check: '<svg class="icon icon-md"><use href="#i-check"/></svg>',
  spark: '<svg class="icon icon-sm"><use href="#i-spark"/></svg>',
  bell: '<svg class="icon icon-sm"><use href="#i-bell"/></svg>',
  list: '<svg class="icon icon-md"><use href="#i-list"/></svg>',
  star: '<svg class="icon"><use href="#i-sword"/></svg>'  // 占位，实际用starSvg()
};

// 徽章专属图标 - 按 conditionType 映射自设计 SVG
const BADGE_ICONS = {
  character_created: '<svg class="icon icon-md"><use href="#i-rocket"/></svg>',
  goal_created: '<svg class="icon icon-md"><use href="#i-target"/></svg>',
  task_completed: '<svg class="icon icon-md"><use href="#i-sword"/></svg>',
  streak_days: '<svg class="icon icon-md"><use href="#i-flame"/></svg>',
  main_completed: '<svg class="icon icon-md"><use href="#i-scroll"/></svg>',
  boss_completed: '<svg class="icon icon-md"><use href="#i-crown"/></svg>',
  xp_total: '<svg class="icon icon-md"><use href="#i-gem"/></svg>',
  level_reached: '<svg class="icon icon-md"><use href="#i-star"/></svg>'
};

// 生成SVG星星
function starSvg(filled = true) {
  const fill = filled ? 'currentColor' : 'none';
  return `<svg class="star-icon" viewBox="0 0 24 24"><path d="M12 2l3 7 7 .5-5.5 4.5 2 7L12 17l-6.5 4 2-7L2 9.5 9 9l3-7z" fill="${fill}" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
}

// 生成指定数量的星星
function starsRow(total, filled) {
  let html = '';
  for (let i = 0; i < total; i++) {
    html += starSvg(i < filled);
  }
  return `<span class="level-stars">${html}</span>`;
}

// =============================================
// State
// =============================================
const state = {
  userId: null,
  user: null,
  authToken: localStorage.getItem('lifequest:authToken') || '',
  character: null,
  goals: [],
  tasks: [],
  badges: [],
  userBadges: [],
  ranking: [],
  aiSettings: {
    deepseekKeyConfigured: false,
    model: 'deepseek-v4-flash'
  },
  selectedGoalId: null,
  taskFilter: 'all',
  currentView: 'auth'
};

const validViews = new Set(['home', 'auth', 'dashboard', 'goals', 'tasks', 'badges', 'ranking', 'admin']);
const protectedViews = new Set(['home', 'dashboard', 'goals', 'tasks', 'badges', 'ranking', 'admin']);

// =============================================
// DOM Cache
// =============================================
const elements = {
  topLogoutButton: document.querySelector('#topLogoutButton'),
  heroNpc: document.querySelector('#heroNpc'),
  levelStars: document.querySelector('#levelStars'),
  views: document.querySelectorAll('[data-view]'),
  viewLinks: document.querySelectorAll('[data-view-link]'),

  loginForm: document.querySelector('#loginForm'),
  registerForm: document.querySelector('#registerForm'),
  registerButton: document.querySelector('#registerButton'),
  usernameInput: document.querySelector('#usernameInput'),
  passwordInput: document.querySelector('#passwordInput'),
  registerUsernameInput: document.querySelector('#registerUsernameInput'),
  registerPasswordInput: document.querySelector('#registerPasswordInput'),
  activationCodeInput: document.querySelector('#activationCodeInput'),
  authHint: document.querySelector('#authHint'),

  goalForm: document.querySelector('#goalForm'),
  goalTitle: document.querySelector('#goalTitle'),
  goalCategory: document.querySelector('#goalCategory'),
  goalDescription: document.querySelector('#goalDescription'),
  deepseekKeyHint: document.querySelector('#deepseekKeyHint'),

  refreshButton: document.querySelector('#refreshButton'),

  characterAvatarButton: document.querySelector('#characterAvatarButton'),
  profileAvatarInput: document.querySelector('#profileAvatarInput'),
  characterAvatarDisplay: document.querySelector('#characterAvatarDisplay'),
  characterName: document.querySelector('#characterName'),
  characterMeta: document.querySelector('#characterMeta'),
  characterLevel: document.querySelector('#characterLevel'),
  characterXp: document.querySelector('#characterXp'),
  characterCoins: document.querySelector('#characterCoins'),
  characterStreak: document.querySelector('#characterStreak'),
  xpBar: document.querySelector('#xpBar'),
  xpToNext: document.querySelector('#xpToNext'),

  npcMessage: document.querySelector('#npcMessage'),
  todoCount: document.querySelector('#todoCount'),
  doneCount: document.querySelector('#doneCount'),
  badgeCount: document.querySelector('#badgeCount'),

  goalList: document.querySelector('#goalList'),
  selectedGoalTitle: document.querySelector('#selectedGoalTitle'),
  selectedGoalDescription: document.querySelector('#selectedGoalDescription'),
  selectedGoalMeta: document.querySelector('#selectedGoalMeta'),
  taskList: document.querySelector('#taskList'),
  badgeList: document.querySelector('#badgeList'),
  rankingList: document.querySelector('#rankingList'),
  authOnly: document.querySelectorAll('.auth-only'),
  adminOnly: document.querySelectorAll('.admin-only'),
  refreshActivationCodesButton: document.querySelector('#refreshActivationCodesButton'),
  createNormalCodeButton: document.querySelector('#createNormalCodeButton'),
  createAdvancedCodeButton: document.querySelector('#createAdvancedCodeButton'),
  adminHint: document.querySelector('#adminHint'),
  adminDeepseekForm: document.querySelector('#adminDeepseekForm'),
  adminDeepseekApiKeyInput: document.querySelector('#adminDeepseekApiKeyInput'),
  adminDeepseekHint: document.querySelector('#adminDeepseekHint'),
  advancedCodeList: document.querySelector('#advancedCodeList'),
  normalCodeList: document.querySelector('#normalCodeList'),

  toast: document.querySelector('.toast-container'),
  toastMessage: document.querySelector('.toast-message')
};

// =============================================
// Event Listeners
// =============================================

elements.topLogoutButton.addEventListener('click', async () => {
  await logout();
});

elements.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await login();
});

elements.registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await register();
});

async function register() {
  const username = elements.registerUsernameInput.value.trim();
  const password = elements.registerPasswordInput.value;
  const activationCode = elements.activationCodeInput.value.trim();
  if (!username || !password || !activationCode) {
    showToast('注册需要用户名、密码和激活码');
    return;
  }
  try {
    const response = await api('/api/auth/register', {
      method: 'POST',
      body: { username, password, activationCode }
    });
    setSession(response.user, response.token);
    showToast(`注册成功：${response.user.username}`);
    await loadAiSettings();
    await refreshAll();
    navigateTo('dashboard');
  } catch (error) {
    console.error('Registration failed:', error);
    showAuthHint(error.message || '注册失败');
    showToast(error.message || '注册失败');
  }
}

elements.goalForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = elements.goalTitle.value.trim();
  if (!title) {
    showToast('请输入目标名称');
    return;
  }

  const payload = {
    title,
    category: elements.goalCategory.value,
    description: elements.goalDescription.value.trim()
  };
  if (!state.aiSettings.deepseekKeyConfigured) {
    showToast('管理员尚未配置 DeepSeek API Key，暂时无法生成任务');
    return;
  }

  try {
    const response = await api('/api/tasks/generate', {
      method: 'POST',
      body: payload
    });

    if (response.npcMessage) {
      elements.heroNpc.textContent = response.npcMessage;
    }

    if (response.goal?.id) {
      setSelectedGoal(response.goal.id, { persist: true, render: false });
    }

    await loadAiSettings();
    showToast(`已生成 ${response.tasks.length} 个${payload.category || ''}副本任务`);
    await refreshAll();
    navigateTo('tasks');
  } catch (error) {
    console.error('Task generation failed:', error);
    showToast(error.message || '生成任务失败');
  }
});

elements.characterAvatarButton.addEventListener('click', () => {
  if (!state.authToken) {
    showToast('请先登录后再修改头像');
    return;
  }
  elements.profileAvatarInput.click();
});

elements.profileAvatarInput.addEventListener('change', async (event) => {
  const [file] = event.target.files || [];
  if (!file) return;
  await saveAvatar(file);
  event.target.value = '';
});

elements.refreshButton.addEventListener('click', async () => {
  await refreshAll();
  showToast('数据已刷新');
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.taskFilter = btn.dataset.filter;
    renderTasks();
  });
});

elements.refreshActivationCodesButton.addEventListener('click', async () => {
  if (await loadActivationCodes()) {
    showToast('激活码列表已刷新');
  }
});

elements.createNormalCodeButton.addEventListener('click', async () => {
  await createActivationCode('normal');
});

elements.createAdvancedCodeButton.addEventListener('click', async () => {
  await createActivationCode('advanced');
});

elements.adminDeepseekForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await saveAdminDeepseekKey();
});

window.addEventListener('hashchange', () => {
  setActiveView(getViewFromHash());
});

// =============================================
// Core Functions
// =============================================

async function login() {
  const username = elements.usernameInput.value.trim();
  const password = elements.passwordInput.value;
  if (!username || !password) {
    showToast('请输入用户名和密码');
    return;
  }
  try {
    const response = await api('/api/auth/login', {
      method: 'POST',
      body: { username, password }
    });
    setSession(response.user, response.token);
    showToast(`欢迎回来，${response.user.username}`);
    await loadAiSettings();
    await refreshAll();
    navigateTo('dashboard');
  } catch (error) {
    console.error('Login failed:', error);
    showAuthHint(error.message || '登录失败');
    showToast(error.message || '登录失败');
  }
}

function setSession(user, token) {
  if (token) {
    state.authToken = token;
    localStorage.setItem('lifequest:authToken', token);
  }
  state.user = user;
  state.userId = user.id;
  state.selectedGoalId = readStoredSelectedGoalId(user.id);
  localStorage.removeItem('lifequest:userId');
  elements.authHint.innerHTML = `
    <svg class="icon icon-xs"><use href="#i-check"/></svg>
    <span>当前用户：<strong>${escapeHtml(user.username)}</strong>（${user.role === 'admin' ? '管理员' : '普通用户'}）</span>
  `;
  updateAdminVisibility();
  updateAuthVisibility();
}

function clearSession() {
  state.authToken = '';
  state.userId = null;
  state.user = null;
  state.character = null;
  state.goals = [];
  state.tasks = [];
  state.badges = [];
  state.userBadges = [];
  state.ranking = [];
  state.aiSettings = {
    deepseekKeyConfigured: false,
    model: 'deepseek-v4-flash'
  };
  state.selectedGoalId = null;
  elements.adminDeepseekApiKeyInput.value = '';
  renderAiSettings();
  localStorage.removeItem('lifequest:authToken');
  localStorage.removeItem('lifequest:userId');
  updateAdminVisibility();
  updateAuthVisibility();
  renderLoggedOutState();
}

async function logout() {
  if (state.authToken) {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Logout request failed:', error);
    }
  }

  clearSession();
  showToast('已退出登录');
  navigateTo('auth');
}

async function saveAvatar(file) {
  if (!file.type.startsWith('image/')) {
    showToast('请选择图片文件作为头像');
    return;
  }
  try {
    const avatar = await readAvatarFile(file);
    const response = await api('/api/profile', {
      method: 'PUT',
      body: {
        avatar
      }
    });
    state.user = response.user;
    state.character = response.character;
    renderCharacter();
    await refreshAll();
    showToast('头像已更新');
  } catch (error) {
    console.error('Save avatar failed:', error);
    showToast(error.message || '保存头像失败');
  }
}

async function refreshAll() {
  if (!state.authToken) {
    renderLoggedOutState();
    return;
  }

  try {
    const [characterData, goalData, taskData, badgeData, rankingData] = await Promise.all([
      api('/api/character'),
      api('/api/goals'),
      api('/api/tasks'),
      api('/api/badges'),
      api('/api/ranking')
    ]);

    state.character = characterData.character;
    state.goals = sortGoalsByTime(goalData.goals || []);
    state.tasks = taskData.tasks || [];
    state.badges = badgeData.badges || [];
    state.userBadges = badgeData.userBadges || [];
    state.ranking = rankingData.ranking || [];
    syncSelectedGoal();

    renderCharacter();
    renderDashboard();
    renderGoalList();
    renderTasks();
    renderBadges();
    renderRanking();
  } catch (error) {
    console.error('Refresh failed:', error);
    if (error.code === 'UNAUTHORIZED' || error.code === 'SESSION_EXPIRED') {
      clearSession();
      navigateTo('auth');
    }
    showToast(error.message || '刷新失败，请检查网络连接');
  }
}

function renderLoggedOutState() {
  showAuthHint('请登录已有账号，或使用有效激活码注册新账号。');
  elements.characterName.textContent = '请先登录';
  elements.characterMeta.textContent = '未进入系统';
  elements.characterAvatarDisplay.innerHTML = '<svg class="icon icon-lg silhouette-icon"><use href="#i-silhouette"/></svg>';
  elements.profileAvatarInput.value = '';
  elements.characterLevel.textContent = 'Lv.0';
  elements.characterXp.textContent = '0 XP';
  elements.characterCoins.textContent = '0';
  elements.characterStreak.textContent = '0';
  elements.xpBar.style.width = '0%';
  elements.xpToNext.textContent = '100';
  elements.todoCount.textContent = '0';
  elements.doneCount.textContent = '0';
  elements.badgeCount.textContent = '0';
  elements.npcMessage.textContent = '登录后才能查看你的副本进度';
  elements.heroNpc.textContent = '登录后才能查看你的副本进度';
  elements.goalList.innerHTML = loggedOutEmptyState('目标列表需要登录后查看');
  elements.selectedGoalTitle.textContent = '请先登录';
  elements.selectedGoalDescription.textContent = '登录后才能查看目标任务中心。';
  elements.selectedGoalMeta.innerHTML = '';
  elements.taskList.innerHTML = loggedOutEmptyState('任务中心需要登录后查看');
  elements.badgeList.innerHTML = loggedOutEmptyState('徽章墙需要登录后查看');
  elements.rankingList.innerHTML = loggedOutEmptyState('排行榜需要登录后查看');
  elements.adminDeepseekHint.textContent = '管理员登录后配置全局 DeepSeek API Key';
  elements.adminDeepseekApiKeyInput.value = '';
  elements.advancedCodeList.innerHTML = loggedOutEmptyState('管理员登录后查看高级激活码');
  elements.normalCodeList.innerHTML = loggedOutEmptyState('管理员登录后查看普通激活码');
}

async function loadAiSettings() {
  if (!state.authToken) return;

  try {
    const response = await api('/api/ai/settings');
    state.aiSettings = response.settings || state.aiSettings;
    renderAiSettings();
  } catch (error) {
    console.error('Load AI settings failed:', error);
  }
}

function renderAiSettings() {
  const configured = Boolean(state.aiSettings.deepseekKeyConfigured);
  elements.deepseekKeyHint.textContent = configured
    ? `AI 任务生成已启用，当前模型：${state.aiSettings.model || 'deepseek-v4-flash'}。`
    : '管理员尚未配置 DeepSeek API Key，暂时无法生成副本任务。';
  elements.deepseekKeyHint.classList.toggle('configured', configured);
  renderAdminAiSettings();
}

function showAuthHint(message) {
  elements.authHint.innerHTML = `
    <svg class="icon icon-xs"><use href="#i-bulb"/></svg>
    <span>${escapeHtml(message)}</span>
  `;
}

function loggedOutEmptyState(message) {
  return `
    <div class="empty-state" style="grid-column: 1 / -1;">
      <div class="empty-icon">${ICONS.lock}</div>
      <h3>需要登录</h3>
      <p class="hint">${escapeHtml(message)}</p>
    </div>
  `;
}

function selectedGoalStorageKey(userId = state.userId) {
  return userId ? `lifequest:selectedGoalId:${userId}` : '';
}

function readStoredSelectedGoalId(userId = state.userId) {
  const key = selectedGoalStorageKey(userId);
  const storedValue = key ? Number(localStorage.getItem(key)) : 0;
  return Number.isFinite(storedValue) && storedValue > 0 ? storedValue : null;
}

function sortGoalsByTime(goals) {
  return [...goals].sort((left, right) => {
    const rightTime = new Date(String(right.createdAt || '').replace(' ', 'T')).getTime() || 0;
    const leftTime = new Date(String(left.createdAt || '').replace(' ', 'T')).getTime() || 0;
    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }
    return Number(right.id || 0) - Number(left.id || 0);
  });
}

function setSelectedGoal(goalId, options = {}) {
  const { persist = true, render = true } = options;
  const normalizedGoalId = Number(goalId);
  state.selectedGoalId = Number.isFinite(normalizedGoalId) && normalizedGoalId > 0 ? normalizedGoalId : null;

  if (persist && state.userId) {
    const key = selectedGoalStorageKey();
    if (state.selectedGoalId) {
      localStorage.setItem(key, String(state.selectedGoalId));
    } else {
      localStorage.removeItem(key);
    }
  }

  if (render) {
    renderGoalList();
    renderTasks();
  }
}

function syncSelectedGoal() {
  const goals = state.goals || [];
  if (goals.length === 0) {
    setSelectedGoal(null, { persist: true, render: false });
    return;
  }

  const currentExists = goals.some(goal => Number(goal.id) === Number(state.selectedGoalId));
  if (currentExists) {
    return;
  }

  const storedGoalId = readStoredSelectedGoalId();
  const storedExists = goals.some(goal => Number(goal.id) === Number(storedGoalId));
  setSelectedGoal(storedExists ? storedGoalId : goals[0].id, { persist: true, render: false });
}

function getSelectedGoal() {
  return (state.goals || []).find(goal => Number(goal.id) === Number(state.selectedGoalId)) || null;
}

function getTasksForGoal(goalId) {
  return (state.tasks || []).filter(task => Number(task.goalId) === Number(goalId));
}

function getSelectedGoalTasks() {
  return state.selectedGoalId ? getTasksForGoal(state.selectedGoalId) : [];
}

function getGoalProgress(tasks) {
  const requiredTasks = (tasks || []).filter(task => task.type === 'main' || task.type === 'boss');
  const doneRequiredTasks = requiredTasks.filter(task => task.status === 'done');
  return {
    done: doneRequiredTasks.length,
    total: requiredTasks.length,
    percent: requiredTasks.length ? Math.round(doneRequiredTasks.length / requiredTasks.length * 100) : 0
  };
}

function isGoalComplete(goal, tasks) {
  if (goal?.status === 'done') {
    return true;
  }
  const progress = getGoalProgress(tasks);
  const hasMain = (tasks || []).some(task => task.type === 'main');
  const hasBoss = (tasks || []).some(task => task.type === 'boss');
  return hasMain && hasBoss && progress.total > 0 && progress.done === progress.total;
}

function isTaskDoneToday(task) {
  const goal = task.goalId ? (state.goals || []).find(item => Number(item.id) === Number(task.goalId)) : null;
  if (goal && isGoalComplete(goal, getTasksForGoal(goal.id))) {
    return true;
  }
  return task.status === 'done' || Boolean(task.completedToday);
}

// =============================================
// Render Functions
// =============================================

function renderCharacter() {
  const char = state.character;
  if (!char) return;

  const avatar = String(char.avatar || '').trim();
  const username = state.user?.username || char.nickname || '主角';

  elements.characterName.textContent = username;
  elements.characterMeta.textContent = '点击头像选择图片文件';
  elements.characterAvatarDisplay.innerHTML = renderAvatar(avatar, username, 'character-avatar-image');
  elements.characterLevel.textContent = `Lv.${char.level || 1}`;
  elements.characterXp.textContent = `${char.xp || 0} XP`;
  elements.characterCoins.textContent = char.coins || 0;
  elements.characterStreak.textContent = char.streakDays || 0;

  const currentLevelXp = (char.xp || 0) % 100;
  const xpPercent = currentLevelXp / 100 * 100;
  elements.xpBar.style.width = `${xpPercent}%`;
  elements.xpToNext.textContent = 100 - currentLevelXp;
}

function renderDashboard() {
  const tasks = state.tasks || [];
  const doneTasks = tasks.filter(task => isTaskDoneToday(task));
  const todoTasks = tasks.filter(task => !isTaskDoneToday(task));

  animateValue(elements.todoCount, todoTasks.length);
  animateValue(elements.doneCount, doneTasks.length);
  animateValue(elements.badgeCount, state.userBadges.length);

  // 更新指标进度条
  updateMetricBars(todoTasks.length, doneTasks.length, state.userBadges.length);

  // 渲染难度星级
  renderDifficultyStars(tasks);

  setNpcMessage(buildDashboardMessage(tasks, todoTasks, doneTasks));
}

function updateMetricBars(todo, done, badges) {
  const total = Math.max(todo + done, 1);
  const bars = document.querySelectorAll('.metric-bar-fill');
  if (bars.length >= 3) {
    bars[0].style.width = `${(todo / total) * 100}%`;
    bars[1].style.width = `${(done / total) * 100}%`;
    const badgeMax = Math.max(state.badges.length, 1);
    bars[2].style.width = `${(badges / badgeMax) * 100}%`;
  }
}

function renderDifficultyStars(tasks) {
  if (!elements.levelStars) return;

  // 根据Boss和困难任务数量计算难度（1-5星）
  const bossCount = tasks.filter(t => t.type === 'boss' && !isTaskDoneToday(t)).length;
  const hardCount = tasks.filter(t => t.difficulty === 'hard' && !isTaskDoneToday(t)).length;
  const totalDifficult = bossCount * 2 + hardCount;

  let stars = 1;
  if (totalDifficult >= 6) stars = 5;
  else if (totalDifficult >= 4) stars = 4;
  else if (totalDifficult >= 2) stars = 3;
  else if (totalDifficult >= 1) stars = 2;

  elements.levelStars.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    elements.levelStars.insertAdjacentHTML('beforeend', starSvg(i < stars));
  }
}

function setNpcMessage(message) {
  elements.npcMessage.textContent = message;
  elements.heroNpc.textContent = message;
}

function buildDashboardMessage(tasks, todoTasks, doneTasks) {
  if (!tasks.length) {
    return '还没有副本任务。先创建一个目标，系统会生成主线、Boss 以及可选每日或支线任务。';
  }

  const selectedGoal = getSelectedGoal();
  const selectedTasks = selectedGoal ? getTasksForGoal(selectedGoal.id) : [];
  if (selectedGoal && selectedTasks.length) {
    const progress = getGoalProgress(selectedTasks);
    const selectedTodoCount = selectedTasks.filter(task => !isTaskDoneToday(task)).length;
    const hasDailyTask = selectedTasks.some(task => task.type === 'daily');
    if (isGoalComplete(selectedGoal, selectedTasks)) {
      return `当前目标「${selectedGoal.title}」已通关：主线与 Boss 已全部完成，可切换其他目标继续推进。`;
    }
    const dailyNote = hasDailyTask ? '；每日任务可作为重复练习，不影响通关进度' : '';
    return `当前目标「${selectedGoal.title}」通关进度 ${progress.done}/${progress.total}，还有 ${selectedTodoCount} 个未完成任务。优先推进主线和 Boss${dailyNote}。`;
  }

  const requiredTodoCount = tasks.filter(task => (task.type === 'main' || task.type === 'boss') && !isTaskDoneToday(task)).length;
  return `当前共有 ${todoTasks.length} 个未完成任务，已完成 ${doneTasks.length} 个任务，其中 ${requiredTodoCount} 个未完成任务影响目标通关。`;
}

function renderGoalList() {
  const goals = state.goals || [];
  if (goals.length === 0) {
    elements.goalList.innerHTML = `
      <div class="empty-state compact">
        <div class="empty-icon">${ICONS.list}</div>
        <h3>还没有目标</h3>
        <p class="hint">先到目标生成页创建目标并生成副本任务。</p>
      </div>`;
    return;
  }

  elements.goalList.innerHTML = goals.map((goal) => {
    const goalTasks = getTasksForGoal(goal.id);
    const progress = getGoalProgress(goalTasks);
    const completed = isGoalComplete(goal, goalTasks);
    const isSelected = Number(goal.id) === Number(state.selectedGoalId);

    return `
      <article class="goal-list-card ${isSelected ? 'active' : ''}">
        <button type="button" class="goal-card-main" data-goal-id="${goal.id}">
          <span class="goal-card-title">${escapeHtml(goal.title)}</span>
          <span class="goal-card-desc">${escapeHtml(goal.description || '暂无目标描述')}</span>
          <span class="goal-card-meta">
            <span>${escapeHtml(goal.category || '未分类')}</span>
            <span>${formatDate(goal.createdAt)}</span>
            <span>${completed ? '已通关' : `${progress.done}/${progress.total} 通关进度`}</span>
          </span>
          <span class="goal-card-progress">
            <span style="width: ${completed ? 100 : progress.percent}%"></span>
          </span>
        </button>
        <button type="button" class="goal-delete-button" data-delete-goal-id="${goal.id}" title="删除目标" aria-label="删除目标：${escapeHtml(goal.title)}">
          删除
        </button>
      </article>
    `;
  }).join('');

  elements.goalList.querySelectorAll('[data-goal-id]').forEach(button => {
    button.addEventListener('click', () => {
      setSelectedGoal(button.getAttribute('data-goal-id'));
      showToast('已切换目标任务中心');
    });
  });

  elements.goalList.querySelectorAll('[data-delete-goal-id]').forEach(button => {
    button.addEventListener('click', async () => {
      const goalId = button.getAttribute('data-delete-goal-id');
      const goal = state.goals.find(item => Number(item.id) === Number(goalId));
      await deleteGoal(goalId, goal?.title || '该目标');
    });
  });
}

async function deleteGoal(goalId, goalTitle) {
  const confirmed = window.confirm(`确定删除目标「${goalTitle}」吗？删除后该目标会从目标列表移除，关联任务不会删除但会脱离目标任务中心。`);
  if (!confirmed) return;

  try {
    await api(`/api/goals/${goalId}`, { method: 'DELETE' });
    if (Number(state.selectedGoalId) === Number(goalId)) {
      setSelectedGoal(null, { persist: true, render: false });
    }
    showToast('目标已删除');
    await refreshAll();
  } catch (error) {
    console.error('Delete goal failed:', error);
    showToast(error.message || '删除目标失败');
  }
}

function renderTasks() {
  const selectedGoal = getSelectedGoal();
  let tasks = getSelectedGoalTasks();
  renderSelectedGoalSummary(selectedGoal, tasks);
  const goalComplete = isGoalComplete(selectedGoal, tasks);

  if (!selectedGoal) {
    elements.taskList.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">${ICONS.list}</div>
        <h3>请选择目标</h3>
        <p class="hint">左侧目标列表会按创建时间倒序显示，点击目标后进入任务中心。</p>
      </div>`;
    return;
  }

  if (state.taskFilter !== 'all') {
    tasks = tasks.filter(task => task.type === state.taskFilter);
  }

  if (tasks.length === 0) {
    const filterNames = { main: '主线', side: '支线', daily: '每日', boss: 'Boss' };
    const filterName = filterNames[state.taskFilter] || '';
    const emptyIcon = state.taskFilter === 'all' ? ICONS.list : ICONS.trophy;

    elements.taskList.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">${emptyIcon}</div>
        <h3>${filterName ? `${filterName}任务为空` : '还没有任务'}</h3>
        <p class="hint">${filterName
          ? '切换其他筛选，或为该目标重新生成任务'
          : '该目标下还没有任务，请回到目标生成页生成副本任务'
        }</p>
      </div>`;
    return;
  }

  const typeConfig = {
    main: { label: '主线', icon: ICONS.sword },
    side: { label: '支线', icon: ICONS.compass },
    daily: { label: '每日', icon: ICONS.calendar },
    boss: { label: 'Boss', icon: ICONS.crown }
  };

  const difficultyConfig = {
    easy: { label: '简单', color: '#9ab8a8' },
    normal: { label: '普通', color: '#a8a8b8' },
    hard: { label: '困难', color: '#b8b8c8' },
    boss: { label: '极难', color: '#b0a898' }
  };

  elements.taskList.innerHTML = tasks.map((task, index) => {
    const typeInfo = typeConfig[task.type] || { label: task.type, icon: '' };
    const diffInfo = difficultyConfig[task.difficulty] || { label: task.difficulty, color: '#909090' };
    const completedToday = Boolean(task.completedToday);
    const isDone = goalComplete || task.status === 'done';
    const isLockedToday = task.type === 'daily' && completedToday;
    const isDisabled = isDone || isLockedToday;
    const statusText = goalComplete || task.status === 'done'
      ? '已通关'
      : isLockedToday
        ? '今日已完成'
        : '待挑战';
    const buttonText = goalComplete || task.status === 'done'
      ? '已通关'
      : isLockedToday
        ? '今日已完成'
        : '完成';
    const typeClass = `type-${task.type}`;

    return `
      <article class="task-card ${typeClass} ${isDone || isLockedToday ? 'done' : ''}" style="animation-delay: ${index * 0.05}s">
        <div class="task-body">
          <h3>
            <span class="task-type-icon">${typeInfo.icon}</span>
            ${escapeHtml(task.title)}
          </h3>
          <p class="task-desc">${escapeHtml(task.description)}</p>
          <div class="task-meta">
            <span class="pill ${typeClass}">${typeInfo.label}</span>
            <span class="pill" style="background: rgba(255,255,255,0.05); color: ${diffInfo.color}; border-color: ${diffInfo.color}33;">${diffInfo.label}</span>
            <span class="pill" style="background: rgba(255,255,255,0.10); color: #e0e0e0; border-color: rgba(255,255,255,0.20);">+${task.xpReward || 20} XP</span>
            <span class="pill" style="${isDone || isLockedToday
              ? 'background: rgba(255,255,255,0.12); color: #c8c8c8; border-color: rgba(255,255,255,0.22);'
              : 'background: rgba(255,255,255,0.05); color: var(--text-muted);'}">${statusText}</span>
          </div>
        </div>
        <button class="task-action-button" data-complete="${task.id}" ${isDisabled ? 'disabled' : ''}>
          ${buttonText}
        </button>
      </article>
    `;
  }).join('');

  document.querySelectorAll('[data-complete]').forEach(button => {
    button.addEventListener('click', handleCompleteTask);
  });
}

function renderSelectedGoalSummary(goal, tasks) {
  if (!goal) {
    elements.selectedGoalTitle.textContent = '请选择一个目标';
    elements.selectedGoalDescription.textContent = '点击左侧目标后查看对应副本任务。';
    elements.selectedGoalMeta.innerHTML = '';
    return;
  }

  const progress = getGoalProgress(tasks);
  const completed = isGoalComplete(goal, tasks);
  const dailyCount = tasks.filter(task => task.type === 'daily').length;
  const sideCount = tasks.filter(task => task.type === 'side').length;
  const totalXp = tasks.reduce((sum, task) => sum + Number(task.xpReward || 0), 0);

  elements.selectedGoalTitle.textContent = goal.title;
  elements.selectedGoalDescription.textContent = goal.description || '暂无目标描述。';
  elements.selectedGoalMeta.innerHTML = `
    <span>${escapeHtml(goal.category || '未分类')}</span>
    <span>创建于 ${formatDate(goal.createdAt)}</span>
    <span>${completed ? '已通关' : `${progress.done}/${progress.total} 通关进度`}</span>
    <span>${dailyCount} 个每日任务</span>
    <span>${sideCount} 个支线任务</span>
    <span>${totalXp} XP</span>
  `;
}

async function handleCompleteTask(event) {
  const button = event.currentTarget;
  const taskId = button.getAttribute('data-complete');
  if (!taskId) return;

  button.disabled = true;
  button.textContent = '处理中';

  try {
    const response = await api(`/api/tasks/${taskId}/complete`, { method: 'PATCH' });

    let message = response.xpGained ? '任务完成，获得经验值' : '任务已完成，无需重复提交';
    if (response.task?.type === 'daily' && response.task?.completedToday && !response.xpGained) {
      message = '每日任务今天已完成，明天可再次挑战';
    }
    if (response.goal?.status === 'done' && !response.xpGained) {
      message = '该目标已通关';
    }
    if (response.unlockedBadges && response.unlockedBadges.length > 0) {
      const badgeNames = response.unlockedBadges.map(badge => badge.name).join('、');
      message += `，解锁徽章：${badgeNames}`;
    }
    if (response.xpGained) {
      message += ` (+${response.xpGained} XP)`;
    }

    showToast(message);
    await refreshAll();
  } catch (error) {
    console.error('Complete task failed:', error);
    button.disabled = false;
    button.textContent = '完成';
    showToast('完成任务失败，请重试');
  }
}

function renderBadges() {
  const badges = state.badges || [];
  const unlockedIds = new Set((state.userBadges || []).map(badge => badge.id));

  if (badges.length === 0) {
    elements.badgeList.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">${ICONS.trophy}</div>
        <h3>暂无徽章</h3>
        <p class="hint">完成任务即可解锁成就徽章</p>
      </div>`;
    return;
  }

  elements.badgeList.innerHTML = badges.map(badge => {
    const isUnlocked = unlockedIds.has(badge.id);
    // 已解锁徽章显示按类型映射的自设计 SVG 图标，未解锁显示锁图标
    const iconHtml = isUnlocked
      ? (BADGE_ICONS[badge.conditionType] || ICONS.medal)
      : ICONS.lock;
    return `
      <article class="badge-card ${isUnlocked ? 'unlocked' : 'locked'}">
        <div class="badge-icon">${iconHtml}</div>
        <strong>${escapeHtml(badge.name)}</strong>
        <span class="badge-desc">${escapeHtml(badge.description)}</span>
        <span class="pill" style="
          background: ${isUnlocked ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)'};
          color: ${isUnlocked ? 'var(--accent-light)' : 'var(--text-muted)'};
          border-color: ${isUnlocked ? 'rgba(255,255,255,0.22)' : 'var(--border-default)'};
        ">${isUnlocked ? '已解锁' : '未解锁'}</span>
      </article>
    `;
  }).join('');
}

function renderRanking() {
  const ranking = state.ranking || [];

  if (ranking.length === 0) {
    elements.rankingList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${ICONS.medal}</div>
        <h3>排行榜暂无数据</h3>
        <p class="hint">完成更多任务，争夺排行榜第一吧</p>
      </div>`;
    return;
  }

  elements.rankingList.innerHTML = ranking.map(item => {
    const rank = item.rank || 0;
    const topClass = rank <= 3 ? `top-${rank}` : '';
    const avatar = String(item.avatar || '').trim();
    const username = item.username || '匿名';

    // 前三名用罗马数字，其余用数字
    const rankDisplay = rank === 1 ? 'I' : rank === 2 ? 'II' : rank === 3 ? 'III' : rank;

    return `
      <article class="ranking-card ${topClass}">
        <span class="rank-number">${rankDisplay}</span>
        <span class="rank-avatar">${renderAvatar(avatar, username, 'rank-avatar-image')}</span>
        <div>
          <strong>${escapeHtml(username)}</strong>
        </div>
        <span>Lv.${item.level || 1} · ${(item.xp || 0).toLocaleString()} XP</span>
      </article>
    `;
  }).join('');
}

async function loadActivationCodes() {
  if (state.user?.role !== 'admin') return false;

  try {
    const data = await api('/api/admin/activation-codes');
    renderActivationCodes(data);
    return true;
  } catch (error) {
    console.error('Load activation codes failed:', error);
    showToast(error.message || '加载激活码失败');
    return false;
  }
}

async function saveAdminDeepseekKey() {
  if (state.user?.role !== 'admin') {
    showToast('只有管理员可以配置 DeepSeek API Key');
    return;
  }

  const apiKey = elements.adminDeepseekApiKeyInput.value.trim();
  if (!apiKey) {
    showToast('请输入 DeepSeek API Key');
    elements.adminDeepseekApiKeyInput.focus();
    return;
  }

  try {
    const response = await api('/api/admin/ai/deepseek-key', {
      method: 'PUT',
      body: { apiKey }
    });
    state.aiSettings = response.settings || state.aiSettings;
    elements.adminDeepseekApiKeyInput.value = '';
    renderAiSettings();
    showToast('DeepSeek API Key 已保存，所有用户现在可以生成任务');
  } catch (error) {
    console.error('Save DeepSeek key failed:', error);
    showToast(error.message || '保存 DeepSeek API Key 失败');
  }
}

function renderAdminAiSettings() {
  if (!elements.adminDeepseekHint) return;

  const configured = Boolean(state.aiSettings.deepseekKeyConfigured);
  elements.adminDeepseekHint.textContent = configured
    ? `DeepSeek 已配置，所有用户可使用 ${state.aiSettings.model || 'deepseek-v4-flash'} 生成副本任务。重新输入可覆盖当前密钥。`
    : 'DeepSeek 尚未配置，普通用户暂时无法生成副本任务。保存后页面不会显示密钥明文。';
  elements.adminDeepseekHint.classList.toggle('configured', configured);
}

async function createActivationCode(type) {
  if (state.user?.role !== 'admin') {
    showToast('只有管理员可以生成激活码');
    return;
  }

  try {
    const data = await api('/api/admin/activation-codes', {
      method: 'POST',
      body: { type }
    });
    renderActivationCodes(data);
    showToast(`已生成${type === 'advanced' ? '高级' : '普通'}激活码：${data.activationCode.code}`);
  } catch (error) {
    console.error('Create activation code failed:', error);
    showToast(error.message || '生成激活码失败');
  }
}

function renderActivationCodes({ advancedCodes = [], normalCodes = [] }) {
  elements.advancedCodeList.innerHTML = advancedCodes.length
    ? advancedCodes.map(code => renderCodeCard(code)).join('')
    : emptyCodeState('暂无有效高级激活码');

  elements.normalCodeList.innerHTML = normalCodes.length
    ? normalCodes.map(code => renderCodeCard(code)).join('')
    : emptyCodeState('暂无有效普通激活码');
}

function renderCodeCard(code) {
  return `
    <article class="code-card">
      <strong>${escapeHtml(code.code)}</strong>
      <span>类型：${code.type === 'advanced' ? '高级激活码' : '普通激活码'}</span>
      <span>剩余次数：${Number(code.remainingUses)} / ${Number(code.maxUses)}</span>
      <span>创建时间：${escapeHtml(code.createdAt || '未知')}</span>
    </article>
  `;
}

function emptyCodeState(message) {
  return `
    <div class="empty-state">
      <div class="empty-icon">${ICONS.lock}</div>
      <h3>暂无数据</h3>
      <p class="hint">${escapeHtml(message)}</p>
    </div>
  `;
}

// =============================================
// Utilities
// =============================================

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (state.authToken) {
    headers.Authorization = `Bearer ${state.authToken}`;
  }

  const response = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload.message || '请求失败');
    error.code = payload.error;
    throw error;
  }
  return payload;
}

function showToast(message) {
  if (!elements.toast || !elements.toastMessage) return;

  elements.toastMessage.textContent = message;
  elements.toast.classList.add('show');

  const progressBar = elements.toast.querySelector('.toast-progress');
  if (progressBar) {
    progressBar.style.animation = 'none';
    void progressBar.offsetWidth;
    progressBar.style.animation = 'toast-progress 2.8s linear forwards';
  }

  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 2800);
}

function getViewFromHash() {
  const view = window.location.hash.replace('#', '').trim();
  return validViews.has(view) ? view : 'auth';
}

function navigateTo(view) {
  const targetView = validViews.has(view) ? view : 'auth';
  if (window.location.hash === `#${targetView}`) {
    setActiveView(targetView);
    return;
  }
  window.location.hash = targetView;
}

function setActiveView(view) {
  let targetView = validViews.has(view) ? view : 'auth';
  if (targetView === 'auth' && state.authToken && state.user) {
    targetView = 'dashboard';
  }
  if (protectedViews.has(targetView) && !state.authToken) {
    targetView = 'auth';
  }
  if (targetView === 'admin' && state.user && state.user.role !== 'admin') {
    targetView = 'dashboard';
    showToast('只有管理员可以访问激活码管理');
  }

  state.currentView = targetView;
  document.body.dataset.view = targetView;

  elements.views.forEach(section => {
    section.classList.toggle('active', section.dataset.view === targetView);
  });

  elements.viewLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.viewLink === targetView);
  });

  if (targetView === 'admin') {
    loadAiSettings();
    loadActivationCodes();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateAdminVisibility() {
  const isAdmin = state.user?.role === 'admin';
  elements.adminOnly.forEach(element => {
    element.classList.toggle('is-hidden', !isAdmin);
  });

  if (!isAdmin && state.currentView === 'admin') {
    navigateTo(state.authToken ? 'dashboard' : 'auth');
  }
}

function updateAuthVisibility() {
  const isLoggedIn = Boolean(state.authToken && state.user);
  elements.authOnly.forEach(element => {
    element.classList.toggle('is-hidden', !isLoggedIn);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderAvatar(avatar, username, imageClass) {
  if (avatar.startsWith('data:image/')) {
    return `<img class="${imageClass}" src="${escapeHtml(avatar)}" alt="${escapeHtml(username)}的头像" />`;
  }
  return `<span class="avatar-initials">${escapeHtml(String(username || 'U').slice(0, 2).toUpperCase())}</span>`;
}

function readAvatarFile(file) {
  const maxFileSize = 3 * 1024 * 1024;
  if (file.size > maxFileSize) {
    throw new Error('头像图片不能超过 3MB');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 160;
        canvas.width = size;
        canvas.height = size;

        const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
        const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2);
        const sourceY = Math.max(0, (image.naturalHeight - sourceSize) / 2);
        const context = canvas.getContext('2d');
        context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
        resolve(canvas.toDataURL('image/webp', 0.82));
      };
      image.onerror = () => reject(new Error('无法读取该头像图片'));
      image.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('无法读取该头像图片'));
    reader.readAsDataURL(file);
  });
}

function formatDate(value) {
  if (!value) return '未知时间';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  });
}

function animateValue(element, targetValue) {
  if (!element) return;
  const startValue = parseInt(element.textContent) || 0;
  const duration = 600;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = 1 - Math.pow(2, -10 * progress);
    const currentValue = Math.round(startValue + (targetValue - startValue) * easeProgress);
    element.textContent = currentValue;
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  requestAnimationFrame(update);
}

async function init() {
  updateAdminVisibility();
  updateAuthVisibility();
  setActiveView(getViewFromHash());

  if (!state.authToken) {
    renderLoggedOutState();
    return;
  }

  try {
    const response = await api('/api/auth/me');
    setSession(response.user);
    await loadAiSettings();
    await refreshAll();
    const initialView = getViewFromHash();
    setActiveView(initialView === 'auth' ? 'dashboard' : initialView);
  } catch (error) {
    console.error('Session restore failed:', error);
    clearSession();
    navigateTo('auth');
    showToast('登录状态已失效，请重新登录');
  }
}

// =============================================
// Init
// =============================================
init().catch(error => {
  console.error('Initialization failed:', error);
  showToast('初始化失败，请确认后端服务已启动');
});
