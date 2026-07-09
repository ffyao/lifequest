# LifeQuest 人生副本任务系统

LifeQuest 是一个游戏化目标管理 Web 应用。用户可以创建人生角色、填写长期目标，系统根据目标生成主线任务、支线任务和每日任务。用户完成任务后获得经验值、提升等级并解锁徽章。

## 技术栈

- 前端：原生 HTML/CSS/JavaScript 单页应用原型
- 后端：Node.js HTTP Server
- 数据库：Node.js 内置 SQLite
- AI：本地规则模板兜底，可扩展真实大模型接口

## 快速启动

```bash
npm run dev
```

启动后访问：

```text
http://localhost:3000
```

## 测试

```bash
npm test
```

## 团队协作

协作规则见：

```text
CONTRIBUTING.md
member-tasks/
```

推荐分支：

```text
main
dev
feature/core
feature/frontend-ui
feature/backend-crud
feature/ai-badges
```

## 默认测试账号

```text
用户名：demo
密码：demo123
```

## 核心演示流程

```text
登录 demo 账号
→ 查看人生角色
→ 输入长期目标
→ 生成副本任务
→ 完成任务
→ 查看 XP、等级、徽章变化
```
