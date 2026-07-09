# LifeQuest API 接口规范

## 1. 通用约定

基础地址：

```text
http://localhost:3000
```

请求头：

```text
Content-Type: application/json
X-User-Id: 1
```

说明：当前课程原型使用 `X-User-Id` 模拟登录态，正式版本应替换为 JWT 或 Session。

## 2. 用户接口

### 注册

```text
POST /api/auth/register
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
  "user": {
    "id": 1,
    "username": "demo",
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
  "user": {
    "id": 1,
    "username": "demo",
    "createdAt": "2026-07-09 10:00:00"
  }
}
```

### 当前用户

```text
GET /api/auth/me
```

## 3. 角色接口

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

## 4. 目标接口

### 查询目标列表

```text
GET /api/goals
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

## 5. 任务接口

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
  "unlockedBadges": []
}
```

## 6. 徽章接口

```text
GET /api/badges
```

返回全部徽章和当前用户已解锁徽章。

## 7. 排行榜接口

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

## 8. AI 日志接口

```text
GET /api/ai/logs
```

用于查看 AI/本地模板生成记录，便于课程过程佐证。
