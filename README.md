# LifeQuest 人生副本任务系统

LifeQuest 是一个带有游戏化体验的目标管理 Web 应用。用户输入学习、健身、阅读、创作或生活类目标后，系统可以调用 DeepSeek 大模型生成“人生副本任务”，并通过主线任务、每日任务、支线任务、Boss 任务、经验值、等级、徽章和排行榜，让目标执行过程更有反馈感。

## 项目介绍与价值

- **目标管理游戏化**：把普通目标拆成副本任务，用 XP、等级、金币、徽章和排行榜提升行动动力。
- **AI 生成任务**：管理员统一配置 DeepSeek API Key 后，普通用户无需配置密钥即可生成个性化任务。
- **目标任务中心**：每个目标会保存对应任务，目标列表按创建时间倒序展示，刷新后会恢复上次选择的目标。
- **通关机制**：目标进度由主线任务和 Boss 任务决定，全部完成后目标通关。
- **账号与激活码**：支持用户名密码登录、注册激活码、7 天会话、管理员激活码管理。
- **本地易部署**：使用原生前端、Node.js HTTP Server 和 Node 内置 SQLite，不依赖复杂后端框架。

## 技术栈

- 前端：原生 HTML、CSS、JavaScript
- 后端：Node.js HTTP Server
- 数据库：Node.js 内置 SQLite
- AI 模型：DeepSeek `deepseek-v4-flash`
- 包管理器：npm

## 环境依赖

- Node.js `>= 22.5.0`
- npm `>= 10`
- 现代浏览器，如 Chrome、Edge、Firefox

说明：项目使用 Node.js 内置 SQLite，不需要额外安装 MySQL、PostgreSQL 或 SQLite 命令行工具。

## 本地运行

克隆项目：

```bash
git clone git@gitee.com:tidehope/lifequest.git
cd lifequest
```

安装依赖：

```bash
npm install
```

启动开发服务：

```bash
npm run dev
```

访问地址：

```text
http://localhost:3000
```

注意：本项目默认启动 HTTP 服务，请不要使用 `https://localhost:3000`。如果浏览器提示 `SSL_ERROR_RX_RECORD_TOO_LONG`，请手动改为 `http://localhost:3000`。

## 生产部署

在 Linux 服务器上部署：

```bash
git clone git@gitee.com:tidehope/lifequest.git
cd lifequest
npm install
PORT=3000 npm start
```

后台运行示例：

```bash
nohup npm start > lifequest.log 2>&1 &
```

如果需要域名或 HTTPS，建议使用 Nginx 或云平台网关反向代理到 Node.js 服务端口：

```text
http://127.0.0.1:3000
```

部署注意事项：

- SQLite 数据库文件位于 `server/data/lifequest.sqlite`。
- 部署环境需要保证 `server/data/` 目录可写并持久化。
- 如果部署平台不支持持久文件系统，建议迁移到 MySQL、PostgreSQL 或其他外部数据库。
- DeepSeek API Key 不要写入代码或提交到仓库，应由管理员登录后在系统配置中保存。

## 使用方式

默认普通账号：

```text
用户名：demo
密码：demo123
```

默认管理员账号：

```text
用户名：admin
密码：admin123456
```

默认高级激活码：

```text
LIFEQUEST-ADV-300
```

基本流程：

```text
登录或注册
→ 管理员配置 DeepSeek API Key
→ 普通用户创建目标
→ 生成副本任务
→ 在目标列表选择目标
→ 进入任务中心完成任务
→ 获得 XP、等级、金币和徽章
→ 查看排行榜
```

注册说明：

- 登录只需要用户名和密码。
- 注册需要有效激活码。
- 普通激活码只能使用一次。
- 高级激活码默认可激活 300 个账号。
- 管理员可以生成普通激活码和高级激活码，并查看有效激活码状态。

## AI 任务生成规则

- 任务只能由 DeepSeek 生成，不使用本地模板兜底。
- 任务类型包括主线任务、Boss 任务、可选每日任务和可选支线任务。
- 短期目标允许不生成每日任务。
- 每日任务每天可完成一次。
- 目标通关只取决于主线任务和 Boss 任务。
- 目标通关后，该目标下所有任务按钮会显示“已通关”。

## 常用命令

```bash
npm run dev      # 启动开发服务
npm start        # 以生产模式启动
npm test         # 运行核心流程测试
```

## 项目结构

```text
lifequest/
├── client/          # 前端页面、样式和交互逻辑
├── server/          # 后端接口、服务和测试
├── package.json     # npm 脚本与 Node 版本要求
└── README.md        # 项目说明
```
