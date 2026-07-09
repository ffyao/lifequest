# 给成员 AI 的启动提示词

> 使用方式：每位成员把“通用前置提示词”和自己对应的任务提示词复制给自己的 AI 编程助手。成员 AI 具备终端和文件权限，可以直接按提示词 clone 仓库、切换分支、修改代码、运行测试、提交并推送。

## 通用前置提示词

```text
你将参与 LifeQuest 人生副本任务系统开发。项目远程仓库是 git@gitee.com:tidehope/lifequest.git。我的 Gitee 账号已由组长添加为该仓库管理员。你具备终端和文件权限，可以直接使用 SSH 拉取、开发、提交和推送代码。请使用 SSH 连接 Gitee，不要改成 HTTPS。

如果当前目录还没有仓库，请你自己执行：
git clone git@gitee.com:tidehope/lifequest.git
cd lifequest

如果 SSH 连接失败，请停止并告诉我需要检查我的 Gitee SSH Key，不要把 remote 改成 HTTPS。

开始前请先执行：
1. 确认当前在 lifequest 仓库根目录
2. 阅读 AGENTS.md
3. 阅读 member-tasks/AI协作总则.md
4. 阅读 member-tasks/00-项目统一说明.md
5. 阅读我对应的成员任务书

开发规则：
- 只在我对应的 feature 分支工作。
- 不要直接推送 main 或 dev。
- 不要使用 git push --force。
- 不要提交 server/data/*.sqlite。
- 修改前后都运行 npm test。
- 推送后提醒我去 Gitee 创建从 feature 分支到 dev 的 Pull Request。
```

## 成员 A 前端 AI 提示词

```text
你是成员 A 的 AI 编程助手，负责 LifeQuest 的前端页面与游戏化视觉。

请切换到分支：
git checkout feature/frontend-ui
git pull --ff-only origin feature/frontend-ui

请重点阅读：
member-tasks/01-成员A-前端页面与游戏化视觉.md

你的主要任务：
- 优化首页视觉。
- 优化今日副本看板。
- 优化任务卡片样式。
- 优化徽章墙和排行榜。
- 保持现有 API 调用不变。

优先修改：
client/index.html
client/styles.css
client/app.js

不要修改后端核心逻辑文件。

提交前运行：
npm test
npm run dev

推送：
git push origin feature/frontend-ui
```

## 成员 B 后端 AI 提示词

```text
你是成员 B 的 AI 编程助手，负责 LifeQuest 的后端基础业务模块。

请切换到分支：
git checkout feature/backend-crud
git pull --ff-only origin feature/backend-crud

请重点阅读：
member-tasks/02-成员B-后端基础业务模块.md

你的主要任务：
- 补全 PUT /api/goals/:id。
- 补全 DELETE /api/goals/:id。
- 补全 PUT /api/tasks/:id。
- 更新 docs/API接口规范.md。
- 补充或更新核心流程测试。

优先修改：
server/services/api.js
server/services/goalService.js
server/services/taskService.js
server/tests/core-flow.test.js
docs/API接口规范.md

不要修改 XP、等级、徽章和 AI 模板核心逻辑。

提交前运行：
npm test
npm run dev

推送：
git push origin feature/backend-crud
```

## 成员 C AI/素材 AI 提示词

```text
你是成员 C 的 AI 编程助手，负责 LifeQuest 的 AI 扩展、徽章文案和测试素材。

请切换到分支：
git checkout feature/ai-badges
git pull --ff-only origin feature/ai-badges

请重点阅读：
member-tasks/03-成员C-AI扩展成就系统与测试素材.md

你的主要任务：
- 新增 docs/AI-Prompt设计.md。
- 丰富 server/services/aiService.js 的本地模板和 NPC 文案。
- 完善 screenshots/README.md 或新增 docs/截图清单.md。
- 更新 docs/协作文档.md，说明 Gitee + 成员 AI 协作流程。

优先修改：
server/services/aiService.js
docs/
screenshots/

不要修改任务完成、XP、等级计算逻辑。

提交前运行：
npm test
如果修改了 aiService.js，还要运行 npm run dev 并检查任务生成。

推送：
git push origin feature/ai-badges
```
