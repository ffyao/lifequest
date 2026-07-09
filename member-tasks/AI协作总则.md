# LifeQuest 成员 AI 协作总则

> 本文档写给成员使用的 AI 编程助手。请先完整阅读，再开始修改代码。

## 1. 项目远程仓库

```text
Gitee 仓库：git@gitee.com:tidehope/lifequest.git
Web 地址：https://gitee.com/tidehope/lifequest
```

本机 SSH 已经配置完成，请使用 SSH 连接 Gitee，不要改用 HTTPS：

```bash
ssh -T git@gitee.com
```

预期输出类似：

```text
Hi TideHope(@tidehope)! You've successfully authenticated, but GITEE.COM does not provide shell access.
```

如果 SSH 失败，先不要改代码，先向组长反馈。

## 2. AI 执行前必须确认

开始任何开发前，请在仓库根目录执行：

```bash
pwd
git status --short --branch
git remote -v
git branch -vv
```

确认：

- 当前目录是 `lifequest`。
- 远程仓库是 `git@gitee.com:tidehope/lifequest.git`。
- 当前分支是自己负责的功能分支。
- 工作区没有未理解的未提交改动。

## 3. 分支分配

```text
main                     稳定主分支，不直接开发
dev                      集成分支，不直接开发
feature/core             组长分支
feature/frontend-ui      成员 A 前端分支
feature/backend-crud     成员 B 后端分支
feature/ai-badges        成员 C AI/徽章/素材分支
```

成员 AI 必须在对应分支工作：

```bash
git fetch origin
git checkout feature/frontend-ui
git pull --ff-only origin feature/frontend-ui
```

成员 B、C 分别替换为自己的分支名。

## 4. 禁止事项

成员 AI 不得执行以下行为：

- 不要直接向 `main` 或 `dev` 提交开发代码。
- 不要使用 `git push --force`。
- 不要使用 `git reset --hard` 删除他人工作。
- 不要删除项目文档和成员任务书。
- 不要提交 `server/data/*.sqlite`。
- 不要提交真实 API Key、Token、账号密码。
- 不要私自改数据库字段和 API 路径。
- 不要把项目重构成完全不同技术栈。
- 不要为完成个人模块破坏核心流程。

如确实需要改公共结构，必须在最终说明里明确写出：

```text
需要组长确认：我改动了公共 API / 数据库字段 / 核心业务规则。
```

## 5. 文件负责边界

### 成员 A：前端页面与游戏化视觉

优先修改：

```text
client/index.html
client/styles.css
client/app.js
```

不要修改：

```text
server/services/database.js
server/services/gameService.js
server/services/taskService.js
```

### 成员 B：后端基础业务模块

优先修改：

```text
server/services/api.js
server/services/goalService.js
server/services/userService.js
server/services/httpUtils.js
server/tests/
```

谨慎修改：

```text
server/services/database.js
```

不要修改：

```text
client/styles.css
docs/架构设计.md
```

### 成员 C：AI 扩展、徽章、素材

优先修改：

```text
server/services/aiService.js
server/services/database.js
screenshots/README.md
docs/协作文档.md
docs/审查报告.md
```

谨慎修改：

```text
server/services/badgeService.js
client/app.js
```

不要修改：

```text
server/services/gameService.js
server/services/taskService.js
```

## 6. 开发前同步

每次开发前执行：

```bash
git fetch origin
git pull --ff-only
npm test
```

如果 `npm test` 在修改前就失败，不要直接修无关问题，先记录并反馈组长。

## 7. 开发中要求

- 修改要小步提交，避免一次性大改。
- 保持原有代码风格。
- 优先复用现有函数和数据结构。
- 新增接口或字段必须有说明。
- 修改后优先运行最相关测试。
- 不要为了视觉或文案修改破坏业务链路。

## 8. 提交前检查

提交前必须执行：

```bash
npm test
git status --short
git diff --stat
```

如果修改了前端，还应执行：

```bash
npm run dev
```

并人工打开：

```text
http://localhost:3000
```

至少检查：

- 首页可打开。
- 登录区域正常显示。
- 任务列表不报错。
- 核心页面没有明显样式崩坏。

## 9. 提交规范

提交信息使用以下格式：

```text
feat: 新增功能
fix: 修复问题
docs: 修改文档
style: 修改页面样式
refactor: 重构代码
test: 添加或修改测试
chore: 配置或杂项
```

示例：

```bash
git add .
git commit -m "style: polish dashboard game ui"
git push
```

## 10. 推送规范

只推送自己的功能分支：

```bash
git push origin feature/frontend-ui
```

不要推送到 `main` 或 `dev`。

推送后，在 Gitee 创建 Pull Request：

```text
源分支：自己的 feature 分支
目标分支：dev
```

## 11. PR 描述必须包含

```text
完成内容：
- 

修改文件：
- 

测试结果：
- npm test 是否通过
- 是否启动页面检查

截图：
- 如有，请说明截图文件名或粘贴到 PR

需要组长注意：
- 是否改了公共结构
- 是否有未完成风险
```

## 12. 核心验收标准

任何成员修改后，都不能破坏以下链路：

```text
登录 demo 账号
→ 读取角色
→ 创建/生成目标任务
→ 展示任务列表
→ 完成任务
→ XP 增加
→ 徽章和排行榜正常展示
```

如不能确认，请在 PR 中写明风险。
