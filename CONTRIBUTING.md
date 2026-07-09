# LifeQuest 团队协作指南

## 1. 分支策略

仓库使用 `main + dev + feature/*` 的协作方式。

```text
main                     最终稳定分支，只放可提交版本
dev                      日常集成分支，成员功能先合并到这里
feature/core             组长：核心逻辑、架构、文档
feature/frontend-ui      成员 A：前端页面与游戏化视觉
feature/backend-crud     成员 B：后端基础接口与 CRUD
feature/ai-badges        成员 C：AI Prompt、徽章、NPC 文案、截图素材
```

## 2. 开发流程

成员首次拉取：

```bash
git clone git@gitee.com:tidehope/lifequest.git
cd lifequest
git checkout dev
git pull origin dev
```

创建自己的功能分支：

```bash
git checkout -b feature/frontend-ui
```

提交代码：

```bash
git add .
git commit -m "feat: 完成副本看板页面"
git push -u origin feature/frontend-ui
```

然后在 Gitee 上创建 Pull Request，目标分支选择 `dev`。

## 3. 提交信息规范

```text
feat: 新功能
fix: 修复问题
docs: 文档修改
style: 页面样式修改
refactor: 代码重构
test: 测试相关
chore: 配置或杂项
```

示例：

```bash
git commit -m "feat: add ranking api"
git commit -m "style: polish dashboard cards"
git commit -m "docs: update operation manual"
```

## 4. 文件边界

### 组长

主要负责：

```text
server/services/gameService.js
server/services/taskService.js
server/services/database.js
docs/
member-tasks/
```

### 成员 A

主要负责：

```text
client/
```

### 成员 B

主要负责：

```text
server/services/api.js
server/services/goalService.js
server/services/userService.js
后端 CRUD 相关文件
```

### 成员 C

主要负责：

```text
server/services/aiService.js
screenshots/
AI Prompt 与文案材料
```

## 5. 合并前检查

每次发 Pull Request 前至少运行：

```bash
npm test
```

如果改了前端页面，还需要启动项目人工检查：

```bash
npm run dev
```

访问：

```text
http://localhost:3000
```

## 6. 禁止事项

- 不要直接推送到 `main`。
- 不要私自修改数据库字段。
- 不要私自修改 API 路径。
- 不要提交 `server/data/*.sqlite`。
- 不要提交真实 API Key、密码、Token。
- 不要为了小功能破坏核心演示链路。

## 7. Pull Request 说明模板

发 PR 时写清楚：

```text
完成内容：
修改文件：
测试结果：
截图：
需要组长注意：
```
