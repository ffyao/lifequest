const state = {
  userId: Number(localStorage.getItem('lifequest:userId') || 1),
  character: null,
  tasks: [],
  badges: [],
  userBadges: [],
  ranking: []
};

const elements = {
  demoLoginButton: document.querySelector('#demoLoginButton'),
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
  npcMessage: document.querySelector('#npcMessage'),
  heroNpc: document.querySelector('#heroNpc'),
  todoCount: document.querySelector('#todoCount'),
  doneCount: document.querySelector('#doneCount'),
  badgeCount: document.querySelector('#badgeCount'),
  taskList: document.querySelector('#taskList'),
  badgeList: document.querySelector('#badgeList'),
  rankingList: document.querySelector('#rankingList'),
  toast: document.querySelector('#toast')
};

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
  const response = await api('/api/auth/register', {
    method: 'POST',
    body: { username, password }
  });
  setUser(response.user);
  showToast(`注册成功：${response.user.username}`);
  await refreshAll();
});

elements.goalForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = {
    title: elements.goalTitle.value.trim(),
    category: elements.goalCategory.value,
    description: elements.goalDescription.value.trim()
  };

  const response = await api('/api/tasks/generate', {
    method: 'POST',
    body: payload
  });

  elements.npcMessage.textContent = response.npcMessage;
  elements.heroNpc.textContent = response.npcMessage;
  showToast(`已生成 ${response.tasks.length} 个 ${response.category} 副本任务`);
  await refreshAll();
  location.hash = '#tasks';
});

elements.refreshButton.addEventListener('click', refreshAll);

async function login() {
  const username = elements.usernameInput.value.trim();
  const password = elements.passwordInput.value;
  const response = await api('/api/auth/login', {
    method: 'POST',
    body: { username, password }
  });
  setUser(response.user);
  showToast(`欢迎回来，${response.user.username}`);
  await refreshAll();
}

function setUser(user) {
  state.userId = user.id;
  localStorage.setItem('lifequest:userId', String(user.id));
  elements.authHint.textContent = `当前用户：${user.username}（ID: ${user.id}）`;
}

async function refreshAll() {
  const [characterData, taskData, badgeData, rankingData] = await Promise.all([
    api('/api/character'),
    api('/api/tasks'),
    api('/api/badges'),
    api('/api/ranking')
  ]);

  state.character = characterData.character;
  state.tasks = taskData.tasks;
  state.badges = badgeData.badges;
  state.userBadges = badgeData.userBadges;
  state.ranking = rankingData.ranking;

  renderCharacter();
  renderDashboard();
  renderTasks();
  renderBadges();
  renderRanking();
}

function renderCharacter() {
  const character = state.character;
  elements.characterName.textContent = character.nickname;
  elements.characterCareer.textContent = character.career;
  elements.characterLevel.textContent = `Lv.${character.level}`;
  elements.characterXp.textContent = `${character.xp} XP`;
  elements.characterCoins.textContent = `金币 ${character.coins}`;
  elements.characterStreak.textContent = `连击 ${character.streakDays} 天`;
  elements.xpBar.style.width = `${character.xp % 100}%`;
}

function renderDashboard() {
  const doneCount = state.tasks.filter((task) => task.status === 'done').length;
  const todoCount = state.tasks.length - doneCount;
  elements.todoCount.textContent = todoCount;
  elements.doneCount.textContent = doneCount;
  elements.badgeCount.textContent = state.userBadges.length;
}

function renderTasks() {
  if (state.tasks.length === 0) {
    elements.taskList.innerHTML = '<p class="hint">还没有任务，先生成一个人生副本吧。</p>';
    return;
  }

  elements.taskList.innerHTML = state.tasks
    .map((task) => {
      const typeName = {
        main: '主线',
        side: '支线',
        daily: '每日',
        boss: 'Boss'
      }[task.type] || task.type;

      return `
        <article class="task-card ${task.status === 'done' ? 'done' : ''}">
          <div>
            <h3>${escapeHtml(task.title)}</h3>
            <p class="hint">${escapeHtml(task.description)}</p>
            <div class="task-meta">
              <span class="pill">${typeName}</span>
              <span class="pill">${task.difficulty}</span>
              <span class="pill">+${task.xpReward} XP</span>
              <span class="pill">${task.status === 'done' ? '已完成' : '待挑战'}</span>
            </div>
          </div>
          <button data-complete="${task.id}" ${task.status === 'done' ? 'disabled' : ''}>
            ${task.status === 'done' ? '已通关' : '完成'}
          </button>
        </article>
      `;
    })
    .join('');

  document.querySelectorAll('[data-complete]').forEach((button) => {
    button.addEventListener('click', async () => {
      const taskId = button.getAttribute('data-complete');
      const response = await api(`/api/tasks/${taskId}/complete`, { method: 'PATCH' });
      const badgeMessage = response.unlockedBadges.length
        ? `，解锁徽章：${response.unlockedBadges.map((badge) => badge.name).join('、')}`
        : '';
      showToast(`任务完成，获得经验${badgeMessage}`);
      await refreshAll();
    });
  });
}

function renderBadges() {
  const unlockedIds = new Set(state.userBadges.map((badge) => badge.id));
  elements.badgeList.innerHTML = state.badges
    .map((badge) => {
      const unlocked = unlockedIds.has(badge.id);
      return `
        <article class="badge-card ${unlocked ? '' : 'locked'}">
          <span class="badge-icon">${badge.icon}</span>
          <strong>${escapeHtml(badge.name)}</strong>
          <span class="hint">${escapeHtml(badge.description)}</span>
          <span class="pill">${unlocked ? '已解锁' : '未解锁'}</span>
        </article>
      `;
    })
    .join('');
}

function renderRanking() {
  elements.rankingList.innerHTML = state.ranking
    .map(
      (item) => `
        <article class="ranking-card">
          <span class="rank-number">${item.rank}</span>
          <div>
            <strong>${escapeHtml(item.nickname)}</strong>
            <p class="hint">${escapeHtml(item.username)} · ${escapeHtml(item.career)}</p>
          </div>
          <span>${item.level} 级 · ${item.xp} XP</span>
        </article>
      `
    )
    .join('');
}

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
    showToast(payload.message || '请求失败');
    throw new Error(payload.message || 'Request failed');
  }
  return payload;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  setTimeout(() => elements.toast.classList.remove('show'), 2600);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

refreshAll().catch((error) => {
  console.error(error);
  showToast('初始化失败，请确认后端服务已启动');
});
