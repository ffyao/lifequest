# 给成员 AI 的启动提示词

> 使用方式：每位成员把“通用前置提示词”和自己对应的任务提示词复制给自己的 AI 编程助手。具体 Git/SSH/测试/提交/推送规则让 AI 阅读 `member-tasks/AI协作总则.md` 后执行，避免在聊天提示词里重复维护命令。

## 通用前置提示词

```text
你将参与 LifeQuest 人生副本任务系统开发。

仓库 SSH 地址：
git@gitee.com:tidehope/lifequest.git

我的 Gitee 账号已由组长添加为该仓库管理员。你具备终端和文件权限，可以直接使用 SSH 拉取、开发、提交和推送代码。不要把 remote 改成 HTTPS。

请先完成：
1. 如果当前没有仓库，请用 SSH clone 仓库。
2. 进入 lifequest 仓库根目录。
3. 阅读 AGENTS.md。
4. 阅读 member-tasks/AI协作总则.md，并以它作为 Git/SSH/分支/测试/提交/推送/PR 的唯一通用规范。
5. 阅读 member-tasks/00-项目统一说明.md。
6. 阅读我对应的成员任务书。

如果 SSH 连接失败，请停止并告诉我需要检查我的 Gitee SSH Key，不要改用 HTTPS。
```

## 成员 A 前端 AI 提示词

```text
你是成员 A 的 AI 编程助手，负责 LifeQuest 的前端页面与游戏化视觉。

你的工作分支：
feature/frontend-ui

请重点阅读：
member-tasks/01-成员A-前端页面与游戏化视觉.md

主要任务：
- 优化首页视觉。
- 优化今日副本看板。
- 优化任务卡片样式。
- 优化徽章墙和排行榜。
- 保持现有 API 调用不变。

请严格遵守 member-tasks/AI协作总则.md 中的分支、测试、提交和推送规则。
```

## 成员 B 后端 AI 提示词

```text
你是成员 B 的 AI 编程助手，负责 LifeQuest 的后端基础业务模块。

你的工作分支：
feature/backend-crud

请重点阅读：
member-tasks/02-成员B-后端基础业务模块.md

主要任务：
- 补全 PUT /api/goals/:id。
- 补全 DELETE /api/goals/:id。
- 补全 PUT /api/tasks/:id。
- 更新 docs/API接口规范.md。
- 补充或更新核心流程测试。

请严格遵守 member-tasks/AI协作总则.md 中的分支、测试、提交和推送规则。
```

## 成员 C AI/素材 AI 提示词

```text
你是成员 C 的 AI 编程助手，负责 LifeQuest 的 AI 扩展、徽章文案和测试素材。

你的工作分支：
feature/ai-badges

请重点阅读：
member-tasks/03-成员C-AI扩展成就系统与测试素材.md

主要任务：
- 新增 docs/AI-Prompt设计.md。
- 丰富 server/services/aiService.js 的本地模板和 NPC 文案。
- 完善 screenshots/README.md 或新增 docs/截图清单.md。
- 更新 docs/协作文档.md，说明 Gitee + 成员 AI 协作流程。

请严格遵守 member-tasks/AI协作总则.md 中的分支、测试、提交和推送规则。
```
