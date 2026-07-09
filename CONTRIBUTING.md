# LifeQuest 团队协作指南

> 本项目由组长和三位成员的 AI 编程助手协作开发。成员 AI 的操作规范以 `member-tasks/AI协作总则.md` 为准。

## 1. 仓库与权限

```text
Gitee SSH：git@gitee.com:tidehope/lifequest.git
Gitee Web：https://gitee.com/tidehope/lifequest
```

组长已将成员账号添加为 Gitee 仓库管理员。成员 AI 具备终端和文件权限时，可以直接使用 SSH 拉取、开发、提交和推送代码。

不要把远程地址改成 HTTPS。若 SSH 失败，先检查成员账号的 Gitee SSH Key。

## 2. 分支策略

```text
main                     稳定主分支，不直接开发
dev                      集成分支，PR 目标分支
feature/core             组长：核心逻辑、架构、文档
feature/frontend-ui      成员 A：前端页面与游戏化视觉
feature/backend-crud     成员 B：后端基础接口与 CRUD
feature/ai-badges        成员 C：AI Prompt、徽章、NPC 文案、截图素材
```

成员 AI 只在自己的 `feature/*` 分支开发，完成后向 `dev` 发 Pull Request。

## 3. 必读文档

成员 AI 按顺序阅读：

```text
AGENTS.md
member-tasks/AI协作总则.md
member-tasks/00-项目统一说明.md
自己的成员任务书
```

具体 Git 命令、测试命令、提交规范、禁止事项和 PR 模板均在 `member-tasks/AI协作总则.md`。

## 4. 文件边界

```text
成员 A：client/
成员 B：server/services/api.js、goalService.js、taskService.js、测试和 API 文档
成员 C：server/services/aiService.js、docs/AI 相关文档、screenshots/
组长：核心规则、架构、最终整合和提交文档
```

公共结构包括数据库字段、API 路径、XP 规则、徽章规则和项目技术栈。成员 AI 修改公共结构前必须先向组长确认。

## 5. 合并要求

Pull Request 前检查、测试、提交、推送和 PR 描述模板统一见 `member-tasks/AI协作总则.md`。

本文不重复维护命令，避免成员 AI 读到不同版本的流程。
