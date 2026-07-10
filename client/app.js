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
  userId: Number(localStorage.getItem('lifequest:userId') || 1),
  character: null,
  tasks: [],
  badges: [],
  userBadges: [],
  ranking: [],
  taskFilter: 'all'
};

// =============================================
// DOM Cache
// =============================================
const elements = {
  demoLoginButton: document.querySelector('#demoLoginButton'),
  heroNpc: document.querySelector('#heroNpc'),
  levelStars: document.querySelector('#levelStars'),

  loginForm: document.querySelector('#loginForm'),
  registerButton: document.querySelector('#registerButton'),
  usernameInput: document.querySelector('#usernameInput'),
  passwordInput: document.querySelector('#passwordInput'),
  authHint: document.querySelector('#authHint'),

  goalForm: document.querySelector('#goalForm'),
  goalTitle: document.querySelector('#goalTitle'),
  goalCategory: document.querySelector('#goalCategory'),
  goalDescription: document.querySelector('#goalDescription'),

  refreshButton: document.querySelector('#refreshButton'),

  characterName: document.querySelector('#characterName'),
  characterCareer: document.querySelector('#characterCareer'),
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

  taskList: document.querySelector('#taskList'),
  badgeList: document.querySelector('#badgeList'),
  rankingList: document.querySelector('#rankingList'),

  toast: document.querySelector('.toast-container'),
  toastMessage: document.querySelector('.toast-message')
};

// =============================================
// Event Listeners
// =============================================

elements.demoLoginButton.addEventListener('click', async () => {
  elements.usernameInput.value = 'demo';
  elements.passwordInput.value = 'demo123';
  await login();
});

elements.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await login();
});

elements.registerButton.addEventListener('click', async () => {
  const username = elements.usernameInput.value.trim();
  const password = elements.passwordInput.value;
  if (!username || !password) {
    showToast('请输入用户名和密码');
    return;
  }
  try {
    const response = await api('/api/auth/register', {
      method: 'POST',
      body: { username, password }
    });
    setUser(response.user);
    showToast(`注册成功：${response.user.username}`);
    await refreshAll();
  } catch (error) {
    console.error('Registration failed:', error);
  }
});

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

  try {
    const response = await api('/api/tasks/generate', {
      method: 'POST',
      body: payload
    });

    if (response.npcMessage) {
      elements.npcMessage.textContent = response.npcMessage;
      elements.heroNpc.textContent = response.npcMessage;
    }

    showToast(`已生成 ${response.tasks.length} 个${payload.category || ''}副本任务`);
    await refreshAll();

    setTimeout(() => {
      document.querySelector('#tasks').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  } catch (error) {
    console.error('Task generation failed:', error);
  }
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
    setUser(response.user);
    showToast(`欢迎回来，${response.user.username}`);
    await refreshAll();
  } catch (error) {
    console.error('Login failed:', error);
  }
}

function setUser(user) {
  state.userId = user.id;
  localStorage.setItem('lifequest:userId', String(user.id));
  elements.authHint.innerHTML = `
    <svg class="icon icon-xs"><use href="#i-check"/></svg>
    <span>当前用户：<strong>${escapeHtml(user.username)}</strong>（ID: ${Number(user.id)}）</span>
  `;
}

async function refreshAll() {
  try {
    const [characterData, taskData, badgeData, rankingData] = await Promise.all([
      api('/api/character'),
      api('/api/tasks'),
      api('/api/badges'),
      api('/api/ranking')
    ]);

    state.character = characterData.character;
    state.tasks = taskData.tasks || [];
    state.badges = badgeData.badges || [];
    state.userBadges = badgeData.userBadges || [];
    state.ranking = rankingData.ranking || [];

    renderCharacter();
    renderDashboard();
    renderTasks();
    renderBadges();
    renderRanking();
  } catch (error) {
    console.error('Refresh failed:', error);
    showToast('刷新失败，请检查网络连接');
  }
}

// =============================================
// Render Functions
// =============================================

function renderCharacter() {
  const char = state.character;
  if (!char) return;

  elements.characterName.textContent = char.nickname || '主角';
  elements.characterCareer.textContent = char.career || '冒险者';
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
  const doneTasks = tasks.filter(task => task.status === 'done');
  const todoTasks = tasks.filter(task => task.status !== 'done');

  animateValue(elements.todoCount, todoTasks.length);
  animateValue(elements.doneCount, doneTasks.length);
  animateValue(elements.badgeCount, state.userBadges.length);

  // 更新指标进度条
  updateMetricBars(todoTasks.length, doneTasks.length, state.userBadges.length);

  // 渲染难度星级
  renderDifficultyStars(tasks);

  // NPC Message
  const currentNpcText = elements.npcMessage.textContent?.trim();
  const defaultMessages = ['等待生成今日副本...', '', undefined, null];

  if (defaultMessages.includes(currentNpcText)) {
    if (tasks.length > 0) {
      const msg = getRandomNpcMessage(todoTasks.length, doneTasks.length);
      setNpcMessage(msg);
    } else {
      setNpcMessage('还没有任务，快去创建你的第一个目标吧！');
    }
  }
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
  const bossCount = tasks.filter(t => t.type === 'boss' && t.status !== 'done').length;
  const hardCount = tasks.filter(t => t.difficulty === 'hard' && t.status !== 'done').length;
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

function getRandomNpcMessage(todo, done) {
  const messages = [
    `勇者，今天还有 ${todo} 个挑战在等你`,
    '每一次微小的完成，都是经验条的跳动',
    '副本在等待你的挑战，从第一个任务开始吧',
    done > 0 ? `已完成 ${done} 个任务，继续保持` : '完成一个主线任务，等级将离提升更近一步',
    '今天不需要完美通关，只要推进一个任务',
    todo > 3 ? '今天的副本难度较高，但你有这个实力' : '今天的任务不多，轻松搞定它们'
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function renderTasks() {
  let tasks = state.tasks || [];
  
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
          ? '切换其他筛选或生成新任务' 
          : '在上方输入长期目标，生成属于你的副本任务吧'
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
    const isDone = task.status === 'done';
    const typeClass = `type-${task.type}`;

    return `
      <article class="task-card ${typeClass} ${isDone ? 'done' : ''}" style="animation-delay: ${index * 0.05}s">
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
            <span class="pill" style="${isDone 
              ? 'background: rgba(255,255,255,0.12); color: #c8c8c8; border-color: rgba(255,255,255,0.22);' 
              : 'background: rgba(255,255,255,0.05); color: var(--text-muted);'}">${isDone ? '已通关' : '待挑战'}</span>
          </div>
        </div>
        <button data-complete="${task.id}" ${isDone ? 'disabled' : ''}>
          ${isDone ? '已通关' : '完成'}
        </button>
      </article>
    `;
  }).join('');

  document.querySelectorAll('[data-complete]').forEach(button => {
    button.addEventListener('click', handleCompleteTask);
  });
}

async function handleCompleteTask(event) {
  const taskId = event.currentTarget.getAttribute('data-complete');
  if (!taskId) return;

  try {
    const response = await api(`/api/tasks/${taskId}/complete`, { method: 'PATCH' });

    let message = '任务完成！获得经验值';
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
    
    // 前三名用罗马数字，其余用数字
    const rankDisplay = rank === 1 ? 'I' : rank === 2 ? 'II' : rank === 3 ? 'III' : rank;

    return `
      <article class="ranking-card ${topClass}">
        <span class="rank-number">${rankDisplay}</span>
        <div>
          <strong>${escapeHtml(item.nickname || '匿名')}</strong>
          <span class="rank-sub">${escapeHtml(item.username)} · ${escapeHtml(item.career || '未知职业')}</span>
        </div>
        <span>Lv.${item.level || 1} · ${(item.xp || 0).toLocaleString()} XP</span>
      </article>
    `;
  }).join('');
}

// =============================================
// Utilities
// =============================================

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': String(state.userId)
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || '请求失败');
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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

// =============================================
// Init
// =============================================
refreshAll().catch(error => {
  console.error('Initialization failed:', error);
  showToast('初始化失败，请确认后端服务已启动');
});
