# LifeQuest API 接口规范

## 1. 通用约定

基础地址：

```text
http://localhost:3000
```

请求头：

```text
Content-Type: application/json
Authorization: Bearer <登录或注册返回的 token>
```

说明：除注册、登录接口外，业务接口都需要登录后携带 `Authorization` 请求头。未登录访问会返回 `401 UNAUTHORIZED`。

## 2. 用户接口

### 注册

```text
POST /api/auth/register
```

请求：

```json
{
  "username": "demo",
  "password": "demo123",
  "activationCode": "LIFEQUEST-ADV-300"
}
```

响应：

```json
{
  "token": "session-token",
  "user": {
    "id": 1,
    "username": "demo",
    "role": "user",
    "createdAt": "2026-07-09 10:00:00"
  }
}
```

### 登录

```text
POST /api/auth/login
```

请求：

```json
{
  "username": "demo",
  "password": "demo123"
}
```

响应：

```json
{
  "token": "session-token",
  "user": {
    "id": 1,
    "username": "demo",
    "role": "user",
    "createdAt": "2026-07-09 10:00:00"
  }
}
```

### 当前用户

```text
GET /api/auth/me
```

## 3. 管理员激活码接口

管理员默认账号：

```text
用户名：admin
密码：admin123456
```

系统默认高级激活码：

```text
LIFEQUEST-ADV-300
```

该高级激活码最多可激活 300 个账号。普通激活码只能激活 1 个账号，被使用后不会出现在有效普通激活码列表中。

### 查看有效激活码

```text
GET /api/admin/activation-codes
```

响应：

```json
{
  "advancedCodes": [
    {
      "code": "LIFEQUEST-ADV-300",
      "type": "advanced",
      "remainingUses": 299,
      "maxUses": 300,
      "createdAt": "2026-07-10 10:00:00"
    }
  ],
  "normalCodes": [
    {
      "code": "LQ-ABCD-1234-EF56",
      "type": "normal",
      "remainingUses": 1,
      "maxUses": 1,
      "createdAt": "2026-07-10 10:00:00"
    }
  ]
}
```

### 生成激活码

```text
POST /api/admin/activation-codes
```

请求：

```json
{
  "type": "normal"
}
```

说明：`type` 可为 `normal` 或 `advanced`。`normal` 可激活 1 个账号，`advanced` 可激活 300 个账号。

## 4. 角色接口

### 查询角色

```text
GET /api/character
```

响应：

```json
{
  "character": {
    "id": 1,
    "userId": 1,
    "nickname": "晨星勇者",
    "career": "学习者",
    "level": 2,
    "xp": 160,
    "coins": 30,
    "streakDays": 2
  }
}
```

### 创建或更新角色

```text
POST /api/character
PUT /api/character
```

请求：

```json
{
  "nickname": "代码法师",
  "career": "创作者"
}
```

## 5. 目标接口

### 查询目标列表

```text
GET /api/goals
```

### 查询目标详情

```text
GET /api/goals/:id
```

响应：

```json
{
  "goal": {
    "id": 1,
    "userId": 1,
    "title": "30 天掌握 Vue 项目开发",
    "description": "完成 Vue 基础、组件通信和一个完整项目。",
    "category": "学习",
    "status": "active",
    "createdAt": "2026-07-09 10:00:00"
  }
}
```

### 创建目标

```text
POST /api/goals
```

请求：

```json
{
  "title": "30 天掌握 Vue 项目开发",
  "description": "完成 Vue 基础、组件通信和一个完整项目。",
  "category": "学习"
}
```

### 更新目标

```text
PUT /api/goals/:id
```

请求（所有字段均可选，仅传需要更新的字段）：

```json
{
  "title": "30 天掌握 Vue 项目开发",
  "description": "完成基础语法、组件通信和项目实战。",
  "category": "学习",
  "status": "active"
}
```

要求：

- 只能更新当前用户自己的目标。
- `title` 不能为空（至少 2 个字符）。
- `status` 可选值：`active`、`paused`、`done`。

响应：

```json
{
  "goal": {
    "id": 1,
    "userId": 1,
    "title": "30 天掌握 Vue 项目开发",
    "description": "完成基础语法、组件通信和项目实战。",
    "category": "学习",
    "status": "active",
    "createdAt": "2026-07-09 10:00:00"
  }
}
```

错误码：

```text
400 INVALID_GOAL_TITLE   标题为空或不足 2 个字符
404 GOAL_NOT_FOUND       目标不存在或不属于当前用户
```

### 删除目标

```text
DELETE /api/goals/:id
```

要求：

- 只能删除当前用户自己的目标。
- 删除后关联任务的 `goalId` 会被自动设为 `NULL`（数据库外键 `ON DELETE SET NULL`）。
- 不会影响任务列表接口的正常返回。

响应：

```json
{
  "deleted": true
}
```

错误码：

```text
404 GOAL_NOT_FOUND       目标不存在或不属于当前用户
```

## 6. 任务接口

### 查询任务列表

```text
GET /api/tasks
```

### 生成任务

```text
POST /api/tasks/generate
```

请求：

```json
{
  "title": "30 天掌握 Vue 项目开发",
  "description": "完成基础语法、组件通信、路由和项目实战。",
  "category": "学习"
}
```

响应：

```json
{
  "provider": "local-template",
  "category": "学习",
  "npcMessage": "知识副本已经开启，勇者先从最小的一步开始。",
  "tasks": [
    {
      "id": 1,
      "title": "绘制知识地图：30 天掌握 Vue 项目开发",
      "type": "main",
      "difficulty": "normal",
      "xpReward": 40,
      "status": "todo"
    }
  ]
}
```

### 完成任务

```text
PATCH /api/tasks/:id/complete
```

响应：

```json
{
  "task": {
    "id": 1,
    "status": "done"
  },
  "character": {
    "level": 3,
    "xp": 220
  },
  "unlockedBadges": [],
  "xpGained": 40
}
```

说明：

- 首次完成任务时，`xpGained` 等于该任务的 `xpReward`。
- 重复完成已通关任务不会再次获得 XP，`xpGained` 返回 `0`。

### 编辑任务

```text
PUT /api/tasks/:id
```

请求（所有字段均可选，仅传需要更新的字段）：

```json
{
  "title": "更新后的任务标题",
  "description": "更新后的任务说明",
  "difficulty": "normal",
  "dueDate": "2026-07-10"
}
```

要求：

- 只能修改当前用户自己的任务。
- `title` 不能为空（至少 2 个字符）。
- `difficulty` 可选值：`easy`、`normal`、`hard`、`boss`。
- **不允许**通过该接口修改 `xpReward`、`status`、`completedAt`。
- **不允许**让已完成任务再次获得 XP。

响应：

```json
{
  "task": {
    "id": 2,
    "userId": 1,
    "goalId": 1,
    "title": "更新后的任务标题",
    "description": "更新后的任务说明",
    "type": "main",
    "difficulty": "normal",
    "xpReward": 40,
    "status": "todo",
    "dueDate": "2026-07-10",
    "completedAt": null,
    "createdAt": "2026-07-09 10:00:00"
  }
}
```

错误码：

```text
400 INVALID_TASK_TITLE    标题为空或不足 2 个字符
400 INVALID_DIFFICULTY    难度值不在允许范围内
404 TASK_NOT_FOUND        任务不存在或不属于当前用户
```

### 删除任务

```text
DELETE /api/tasks/:id
```

要求：

- 只能删除当前用户自己的任务。

响应：

```json
{
  "deleted": true
}
```

错误码：

```text
404 TASK_NOT_FOUND        任务不存在或不属于当前用户
```

## 7. 徽章接口

```text
GET /api/badges
```

返回全部徽章和当前用户已解锁徽章。

## 8. 排行榜接口

```text
GET /api/ranking
```

返回字段：

```text
rank
username
nickname
career
level
xp
```

## 9. AI 日志接口

```text
GET /api/ai/logs
```

用于查看 AI/本地模板生成记录，便于课程过程佐证。
