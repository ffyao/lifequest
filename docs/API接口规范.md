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

说明：除注册、登录接口外，业务接口都需要登录后携带 `Authorization` 请求头。未登录访问会返回 `401 UNAUTHORIZED`。登录或注册成功后，会话有效期为 7 天。

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

### 更新头像

```text
PUT /api/profile
```

说明：该接口只更新当前登录用户的角色头像。用户名保持账号注册时的用户名，不提供修改机制；个性签名不再使用。

请求：

```json
{
  "avatar": "data:image/webp;base64,..."
}
```

字段约束：

```text
avatar  图片文件在前端压缩后生成的 data:image 数据，可为空
```

响应：

```json
{
  "user": {
    "id": 1,
    "username": "demo",
    "role": "user",
    "createdAt": "2026-07-09 10:00:00"
  },
  "character": {
    "id": 1,
    "userId": 1,
    "nickname": "demo",
    "career": "冒险者",
    "avatar": "data:image/webp;base64,...",
    "level": 2,
    "xp": 160,
    "coins": 30,
    "streakDays": 2
  },
  "unlockedBadges": []
}
```

### 注销当前会话

```text
POST /api/auth/logout
```

说明：调用后服务端会删除当前 token 对应的会话，前端应同步清理本地登录状态。

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
    "avatar": "data:image/webp;base64,...",
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
  "career": "创作者",
  "avatar": "data:image/webp;base64,..."
}
```

说明：`avatar` 为空表示使用默认头像；非空时必须是图片文件生成的 `data:image/...;base64,...` 数据。用户名来自账号注册信息，不通过角色接口修改。

## 5. AI 配置接口

### 查询 AI 配置状态

```text
GET /api/ai/settings
```

响应：

```json
{
  "settings": {
    "deepseekKeyConfigured": true,
    "model": "deepseek-v4-flash",
    "managedBy": "admin"
  }
}
```

### 管理员保存 DeepSeek API Key

```text
PUT /api/admin/ai/deepseek-key
```

请求：

```json
{
  "apiKey": "sk-..."
}
```

说明：只有管理员可以保存全局 DeepSeek API Key。保存成功后，所有普通用户都可以直接生成副本任务。服务端不会通过接口返回密钥明文。

## 6. 目标接口

### 查询目标列表

```text
GET /api/goals
```

说明：目标按创建时间倒序返回，最新目标在最上方。前端会基于该列表恢复或选择当前目标。

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
    "completedAt": null,
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
- `status` 为目标状态文本；前端常用 `active`、`paused`、`done`。

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
    "completedAt": null,
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
- 不会影响任务接口的正常返回；关联任务会变为未归属目标，前端目标任务中心不再展示这些任务。

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

## 7. 任务接口

### 查询任务列表

```text
GET /api/tasks
```

说明：接口返回当前用户所有任务。前端会按当前选中的 `goalId` 过滤任务，形成目标任务中心。

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

说明：任务生成使用管理员全局 DeepSeek API Key 调用 DeepSeek `deepseek-v4-flash` 模型的 `POST /chat/completions`。任务只能由 AI 生成，后端不使用本地模板兜底。生成结果必须包含 3 到 6 个副本任务，且至少包含 1 个主线和 1 个 Boss；每日任务和支线任务可选，短期目标允许不生成每日任务。模型必须为每个任务返回 `xpReward`，后端会校验任务数量、类型、难度、XP 整数范围、标题、描述和模板化标题后再写入数据库；如首次结果是可修复的格式问题，会携带失败原因请求 DeepSeek 重新生成一次。

响应：

```json
{
  "provider": "deepseek",
  "model": "deepseek-v4-flash",
  "category": "学习",
  "npcMessage": "DeepSeek 已为你开启本次人生副本。",
  "tasks": [
    {
      "id": 1,
      "title": "拆解学习路线",
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
    "status": "done",
    "completedToday": false
  },
  "goal": {
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
- 主线、支线和 Boss 任务完成后不会再次获得 XP，`xpGained` 返回 `0`。
- 每日任务每天可以完成一次；当天重复提交返回 `xpGained: 0`，任务仍保持 `todo`，并通过 `completedToday: true` 表示今日已完成。
- 目标通关进度只取决于主线和 Boss；当同一目标下所有主线和 Boss 都完成后，`goal.status` 更新为 `done`。
- 目标通关后，该目标下任意任务再次提交都不会获得 XP，前端完成按钮统一显示“已通关”。

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

## 8. 徽章接口

```text
GET /api/badges
```

返回全部徽章和当前用户已解锁徽章。

## 9. 排行榜接口

```text
GET /api/ranking
```

返回字段：

```text
rank
username
nickname
career
avatar
level
xp
```

说明：`username` 始终为账号注册时的用户名；排行榜不展示个性签名，也不支持在前端修改用户名。

## 10. AI 日志接口

```text
GET /api/ai/logs
```

用于查看 DeepSeek 任务生成记录，便于课程过程佐证。
