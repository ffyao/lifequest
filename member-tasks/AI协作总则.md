# LifeQuest 成员 AI 协作总则

> 本文件是成员 AI 的唯一通用操作规范。Git、SSH、分支、测试、提交、推送、PR 和禁止事项均以本文为准。

## 1. 仓库和权限

```text
Gitee SSH：git@gitee.com:tidehope/lifequest.git
Gitee Web：https://gitee.com/tidehope/lifequest
```

组长已将成员账号添加为 Gitee 仓库管理员。成员 AI 具备终端和文件权限，可以直接使用 SSH 拉取、开发、提交和推送自己的 feature 分支。

不要把远程地址改成 HTTPS。如果 SSH 失败，先停止并提示成员检查自己的 Gitee SSH Key，不要继续改代码。

## 2. 标准启动流程

如果当前还没有本地仓库：

```bash
git clone git@gitee.com:tidehope/lifequest.git
cd lifequest
```

确认远程和分支：

```bash
pwd
git remote -v
git status --short --branch
git branch -vv
```

远程必须是：

```text
git@gitee.com:tidehope/lifequest.git
```

## 3. 分支分配

```text
main                     稳定主分支，不直接开发
dev                      集成分支，不直接开发
feature/core             组长分支
feature/frontend-ui      成员 A 前端分支
feature/backend-crud     成员 B 后端分支
feature/ai-badges        成员 C AI/徽章/素材分支
```

切换到自己的分支后再开发：

```bash
git fetch origin
git checkout <your-feature-branch>
git pull --ff-only origin <your-feature-branch>
npm test
```

如果修改前 `npm test` 已失败，先记录失败信息并反馈组长，不要直接修无关问题。

## 4. 文件负责边界

成员 A 优先修改：

```text
client/index.html
client/styles.css
client/app.js
```

成员 B 优先修改：

```text
server/services/api.js
server/services/goalService.js
server/services/taskService.js
server/tests/
docs/API接口规范.md
```

成员 C 优先修改：

```text
server/services/aiService.js
docs/
screenshots/
```

公共结构包括：

```text
数据库字段
API 路径
XP 和等级规则
徽章解锁规则
项目技术栈
```

修改公共结构前必须先向组长确认。

## 5. 禁止事项

- 不要直接向 `main` 或 `dev` 提交开发代码。
- 不要使用 `git push --force`。
- 不要使用 `git reset --hard` 删除未理解的改动。
- 不要删除项目文档和成员任务书。
- 不要提交 `server/data/*.sqlite`。
- 不要提交真实 API Key、Token、账号密码。
- 不要把项目重构成完全不同技术栈。
- 不要为了个人模块破坏核心演示链路。

## 6. 开发要求

- 修改要小步、聚焦、可解释。
- 保持现有代码风格。
- 优先复用现有函数和数据结构。
- 新增接口、字段、依赖必须在最终说明里写清楚。
- 如果某项任务无法完成，不要伪造结果，在最终说明中标为风险。

## 7. 提交前检查

所有成员提交前必须执行：

```bash
npm test
git status --short
git diff --stat
```

如果修改了前端页面，还必须执行：

```bash
npm run dev
```

并检查：

```text
http://localhost:3000
```

前端检查至少覆盖：

```text
首页可打开
Demo 登录入口可见
任务列表不报错
核心页面没有明显样式崩坏
```

## 8. 提交和推送

提交信息格式：

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
git add <changed-files>
git commit -m "style: polish dashboard game UI"
git push origin <your-feature-branch>
```

只推送自己的 feature 分支，不要推送 `main` 或 `dev`。

## 9. PR 规则

推送后，在 Gitee 创建 Pull Request：

```text
源分支：自己的 feature 分支
目标分支：dev
```

PR 描述必须包含：

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

## 10. 核心验收标准

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
