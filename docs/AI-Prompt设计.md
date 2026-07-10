# LifeQuest AI Prompt 设计文档

> 本文档记录 LifeQuest 使用 DeepSeek 生成副本任务的 Prompt 设计思路、输入输出规范、示例和失败处理策略。

## 1. Prompt 目标

将用户输入的长期目标（如"30 天掌握 Vue 开发"）通过 DeepSeek `deepseek-v4-flash` 拆解为一组结构化的 RPG 副本任务，包含主线、每日、Boss 和可选支线任务，并返回一段 NPC 引导文案，让用户有"进入副本"的游戏代入感。

具体目标：

- 结合目标标题、描述和分类生成专属任务，不使用本地模板或固定兜底样例。
- 生成 3 到 6 个任务，至少包含 1 个 main、1 个 daily、1 个 boss，side 为可选任务。
- main 和 boss 决定目标通关进度；daily 每天可以完成一次，但不影响目标是否通关。
- 每个任务标注难度（easy / normal / hard / boss），后端根据难度统一计算 XP 奖励，模型无需决定 XP。
- 返回一条 NPC 文案，风格为 RPG 向导鼓励语。
- 输出为 JSON，可直接被后端 `aiService.generateTasks` 消费。

## 2. 输入字段

Prompt 输入为用户创建的目标对象：

| 字段        | 类型   | 说明                                   | 示例                           |
| ----------- | ------ | -------------------------------------- | ------------------------------ |
| `title`     | string | 目标标题，用户自由输入                 | `"14 天完成 JavaScript 基础"`  |
| `description` | string | 目标描述，可空                         | `"复习语法、函数、数组和 DOM"` |
| `category`  | string | 目标分类，默认 `学习`                  | `"学习"`                       |

## 3. 输出 JSON Schema

AI 必须返回以下 JSON 结构。`xpReward` 不由模型返回，后端会在校验通过后根据 `difficulty` 统一补充：

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["npcMessage", "tasks"],
  "properties": {
    "npcMessage": {
      "type": "string",
      "description": "NPC 向导引导文案，RPG 风格鼓励语"
    },
    "tasks": {
      "type": "array",
      "minItems": 3,
      "maxItems": 6,
      "items": {
        "type": "object",
        "required": ["type", "difficulty", "title", "description"],
        "properties": {
          "type": {
            "type": "string",
            "enum": ["main", "side", "daily", "boss"]
          },
          "difficulty": {
            "type": "string",
            "enum": ["easy", "normal", "hard", "boss"]
          },
          "title": {
            "type": "string",
            "description": "任务标题，简洁有力"
          },
          "description": {
            "type": "string",
            "description": "任务描述，说明具体要做什么"
          }
        }
      }
    }
  }
}
```

### 难度与 XP 对应关系

```text
easy   → 20 XP
normal → 40 XP
hard   → 80 XP
boss   → 150 XP
```

### 任务类型说明

```text
main   主线任务，推进目标核心进展
side   支线任务，可选的辅助准备、资料收集或趣味探索
daily  每日任务，每天可完成一次的小步行动
boss   Boss 任务，决定目标通关的最终挑战
```

## 4. 完整 Prompt 示例

### 4.1 系统提示词（System Prompt）

```text
你是 LifeQuest 人生副本系统的 AI 任务生成引擎。用户会输入一个现实中的长期目标，你需要把它拆解为一组 RPG 风格的副本任务。

规则：
1. 只能根据用户目标现场生成任务，不得使用固定模板、通用模板或兜底样例。
2. 生成 3 到 6 个任务，至少包含 1 个 main、1 个 daily、1 个 boss。
3. side 为可选类型，可返回 0 到 2 个；不要为了凑数强行生成支线。
4. daily 必须适合每天重复执行，main 和 boss 必须能体现目标核心进度。
5. 每个任务包含 type、difficulty、title、description 四个字段。
6. boss 类型任务的 difficulty 必须为 boss，非 boss 类型任务不能使用 boss 难度。
7. 返回一条 npcMessage，风格为 RPG 向导的鼓励语，不超过 40 字。
8. 仅输出 JSON，不要输出任何解释或 Markdown 代码块标记。
```

### 4.2 用户提示词（User Prompt 模板）

```text
请为以下目标生成副本任务：

目标标题：{title}
目标描述：{description}
目标分类：{category}

请按 JSON 格式输出：
{
  "npcMessage": "勇者，副本已开启...",
  "tasks": [
    { "type": "main", "difficulty": "normal", "title": "...", "description": "..." }
  ]
}
```

### 4.3 调用示例（伪代码）

```javascript
const response = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'deepseek-v4-flash',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify({ goal, outputLanguage: 'zh-CN' }) }
    ],
    thinking: { type: 'disabled' },
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 1600,
    stream: false,
    user_id: `lifequest-${userId}`
  })
});
```

## 5. 学习类目标示例输出

输入：

```json
{
  "title": "14 天完成 JavaScript 基础复习",
  "description": "复习语法、函数、数组和 DOM 操作。",
  "category": "学习"
}
```

期望输出：

```json
{
  "npcMessage": "知识副本已经开启，勇者先从最小的一步开始。",
  "tasks": [
    {
      "type": "main",
      "difficulty": "normal",
      "title": "绘制 JavaScript 知识地图",
      "description": "梳理语法、函数、数组和 DOM 的核心知识点，确定本周学习路线。",
      "xpReward": 40
    },
    {
      "type": "side",
      "difficulty": "easy",
      "title": "完成资料收集",
      "description": "整理 3 个高质量 JavaScript 教程、视频或参考资料。",
      "xpReward": 20
    },
    {
      "type": "daily",
      "difficulty": "easy",
      "title": "完成 25 分钟专注学习",
      "description": "使用番茄钟完成一次无打断的 JavaScript 学习。",
      "xpReward": 20
    },
    {
      "type": "daily",
      "difficulty": "normal",
      "title": "输出一份学习笔记",
      "description": "用自己的话总结今天学到的 3 个重点。",
      "xpReward": 40
    },
    {
      "type": "boss",
      "difficulty": "boss",
      "title": "完成一个实战小作品",
      "description": "用 JavaScript 完成一个可展示的 DOM 交互小 Demo。",
      "xpReward": 150
    }
  ]
}
```

## 6. 健身类目标示例输出

输入：

```json
{
  "title": "30 天减脂 3 公斤",
  "description": "通过跑步和饮食控制减脂。",
  "category": "健身"
}
```

期望输出：

```json
{
  "npcMessage": "体能副本开启，稳住节奏比冲太猛更重要。",
  "tasks": [
    {
      "type": "main",
      "difficulty": "normal",
      "title": "制定减脂训练计划",
      "description": "确定本周跑步频率、配速和饮食控制方案。",
      "xpReward": 40
    },
    {
      "type": "side",
      "difficulty": "easy",
      "title": "记录身体初始状态",
      "description": "记录体重、围度和今日运动感受，作为后续对比基准。",
      "xpReward": 20
    },
    {
      "type": "daily",
      "difficulty": "easy",
      "title": "完成 15 分钟热身",
      "description": "进行动态拉伸和基础激活，避免运动损伤。",
      "xpReward": 20
    },
    {
      "type": "daily",
      "difficulty": "normal",
      "title": "完成一次正式跑步训练",
      "description": "完成 30 分钟以上的慢跑或间歇跑。",
      "xpReward": 40
    },
    {
      "type": "boss",
      "difficulty": "boss",
      "title": "完成周度挑战跑",
      "description": "完成一次比平时更长距离或更高配速的挑战跑。",
      "xpReward": 150
    }
  ]
}
```

## 7. DeepSeek 调用与失败处理

当前项目使用 DeepSeek `deepseek-v4-flash` 作为副本任务生成模型。每个用户首次生成任务前必须配置自己的 DeepSeek API Key，配置入口位于目标生成表单，输入框占位文本固定为 `请配置deepseek apikey（前往platform.deepseek.com）`。

### 7.1 生成流程

```text
用户登录
  → 前端读取 /api/ai/settings 判断是否已配置 API Key
  → 未配置时要求在目标生成表单填写 DeepSeek API Key
  → POST /api/tasks/generate
  → 后端调用 https://api.deepseek.com/chat/completions
  → 使用 model=deepseek-v4-flash、thinking.disabled、response_format.json_object
  → 解析 DeepSeek 返回 JSON
  → 校验 npcMessage、任务数量、必选任务类型、任务难度和文本长度
  → 校验通过后保存该用户 API Key
  → 写入 ai_logs 和 tasks
  → 返回目标、任务列表与 NPC 文案
```

### 7.2 后端校验规则

1. DeepSeek 必须返回合法 JSON，结构为 `{ "npcMessage": string, "tasks": Task[] }`。
2. `tasks` 必须为 3 到 6 个。
3. 类型组合必须至少包含 1 个 `main`、1 个 `daily`、1 个 `boss`；`side` 为可选，最多 2 个。
4. `difficulty` 必须是 `easy`、`normal`、`hard` 或 `boss`。
5. Boss 类型任务的 `difficulty` 必须为 `boss`，非 Boss 任务不能使用 `boss` 难度。
6. 后端根据难度计算 XP：`easy=20`、`normal=40`、`hard=80`、`boss=150`。
7. 校验失败时不保存任务，首次传入的 API Key 也不会因为失败结果而保存。
8. DeepSeek 返回结果不满足规则时直接失败，不会回退到本地模板任务。

### 7.3 失败处理

以下情况直接返回错误并中止任务生成：

1. 当前用户未配置 DeepSeek API Key。
2. DeepSeek API Key 格式明显不正确。
3. DeepSeek 请求超时、网络失败、余额不足、权限错误或频率限制。
4. DeepSeek 返回空内容、被截断内容或非 JSON 内容。
5. DeepSeek 返回的任务数量、类型、难度或文本不符合系统规则。

> 重要：XP 规则和任务类型属于后端公共规则，不允许由模型直接决定。模型只负责生成标题、描述、类型和难度，最终写库前必须经过后端校验。

## 8. Prompt 迭代记录

| 版本 | 日期       | 变更说明                                         |
| ---- | ---------- | ------------------------------------------------ |
| v1   | 2026-07-10 | 初始版本，定义输入输出 Schema 和示例。   |
| v2   | 2026-07-10 | 接入 DeepSeek `deepseek-v4-flash`，补充用户级 API Key、JSON 模式和后端校验策略。 |
| v3   | 2026-07-10 | 移除本地模板兜底，改为 AI-only 生成；主线、每日、Boss 必选，支线可选；明确每日任务和目标通关规则。 |
