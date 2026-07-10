# LifeQuest AI Prompt 设计文档

> 本文档记录 LifeQuest 使用 DeepSeek 生成副本任务的 Prompt 设计思路、输入输出规范、示例和失败处理策略。

## 1. Prompt 目标

将用户输入的目标（如"30 天掌握 Vue 开发"或"周末完成作品集首页草稿"）通过 DeepSeek `deepseek-v4-flash` 拆解为一组结构化的 RPG 副本任务，包含主线、Boss、可选每日和可选支线任务，并返回一段 NPC 引导文案，让用户有"进入副本"的游戏代入感。

具体目标：

- 结合目标标题、描述和分类生成专属任务，不使用本地模板或固定兜底样例。
- 生成 3 到 6 个任务，至少包含 1 个 main 和 1 个 boss，daily 与 side 为可选任务。
- main 和 boss 决定目标通关进度；daily 每天可以完成一次，但不影响目标是否通关。
- 短期目标、一次性目标或冲刺型目标允许不生成 daily；长期目标和习惯养成目标可以生成 1 到 2 个 daily。
- 任务标题和任务描述必须自然表达，不使用“任务内容：任务名称”“任务名称：...”这类字段标签格式。
- 避免“绘制知识地图”“完成实战小目标”等高频模板化标题，要求每个标题绑定目标中的具体对象、场景或产出物。
- 如果 DeepSeek 首次返回模板化标题，后端会携带校验失败原因要求模型重新生成一次，仍不合格才返回错误。
- 每个任务标注难度（easy / normal / hard / boss）并生成 `xpReward`；后端只校验整数范围，不再根据难度固定映射 XP。
- 每日任务经验通常应低于同等投入的 main/side，但具体数值由模型根据任务行动成本决定，不机械套固定值。
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

AI 必须返回以下 JSON 结构。`xpReward` 由模型生成，后端会校验它是 5 到 220 的整数后写入数据库：

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
        "required": ["type", "difficulty", "title", "description", "xpReward"],
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
          },
          "xpReward": {
            "type": "integer",
            "minimum": 5,
            "maximum": 220,
            "description": "任务完成后获得的 XP，由模型根据行动成本和目标价值生成"
          }
        }
      }
    }
  }
}
```

### XP 生成建议

```text
daily 多数为 10 到 35 XP，偏向小步重复行动。
main / side 多数为 25 到 90 XP，按行动成本和产出价值浮动。
boss 多数为 80 到 180 XP，应体现目标最终挑战。
以上是参考区间，不是固定模板；只要在 5 到 220 之间且符合任务价值即可。
```

### 任务类型说明

```text
main   主线任务，推进目标核心进展
side   支线任务，可选的辅助准备、资料收集或趣味探索
daily  可选每日任务，每天可完成一次的小步行动
boss   Boss 任务，决定目标通关的最终挑战
```

## 4. 完整 Prompt 示例

### 4.1 系统提示词（System Prompt）

```text
你是 LifeQuest 人生副本系统的 AI 任务生成引擎。用户会输入一个现实目标，你需要把它拆解为一组 RPG 风格的副本任务。

规则：
1. 只能根据用户目标现场生成任务，不得使用固定模板、通用模板或兜底样例。
2. 生成 3 到 6 个任务，至少包含 1 个 main 和 1 个 boss。
3. daily 为可选类型：长期目标、习惯养成目标可生成 1 到 2 个；短期目标、一次性目标、冲刺型目标允许不生成。
4. side 为可选类型，可返回 0 到 2 个；不要为了凑数强行生成支线。
5. daily 必须适合每天重复执行，main 和 boss 必须能体现目标核心进度。
6. 每个任务包含 type、difficulty、title、description、xpReward 五个字段。
7. xpReward 是 5 到 220 的整数，由你根据任务行动成本决定；daily 经验通常偏低，但不要机械套固定值。
8. boss 类型任务的 difficulty 必须为 boss，非 boss 类型任务不能使用 boss 难度。
9. title 和 description 不得写成“任务内容：任务名称”“任务名称：...”等字段标签格式。
10. title 不得包含冒号，不得使用“绘制知识地图”“完成实战小目标”等高频模板化标题。
11. 返回一条 npcMessage，风格为 RPG 向导的鼓励语，不超过 40 字。
12. 仅输出 JSON，不要输出任何解释或 Markdown 代码块标记。
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
    { "type": "main", "difficulty": "normal", "title": "...", "description": "...", "xpReward": 45 }
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
      "title": "定位 DOM 复习薄弱点",
      "description": "用三道 DOM 操作题找出当前最容易卡住的语法和调用方式。",
      "xpReward": 45
    },
    {
      "type": "side",
      "difficulty": "easy",
      "title": "挑选一个调试参照页",
      "description": "选择一个简单网页作为 DOM 练习对象，并标注需要操作的元素。",
      "xpReward": 24
    },
    {
      "type": "daily",
      "difficulty": "easy",
      "title": "改写一个数组例子",
      "description": "把一个数组方法示例换成自己的数据场景，并运行确认结果。",
      "xpReward": 16
    },
    {
      "type": "daily",
      "difficulty": "normal",
      "title": "复述一个 DOM 场景",
      "description": "用自己的话说明一次查询元素、绑定事件和更新页面的完整过程。",
      "xpReward": 26
    },
    {
      "type": "boss",
      "difficulty": "boss",
      "title": "做出事件委托清单页",
      "description": "用事件委托完成一个可增删条目的清单页，并检查交互是否稳定。",
      "xpReward": 135
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
      "title": "排定三次跑步窗口",
      "description": "结合本周空闲时间安排三次跑步，并写明每次距离和配速目标。",
      "xpReward": 50
    },
    {
      "type": "side",
      "difficulty": "easy",
      "title": "拍下今日餐盘结构",
      "description": "记录一餐的主食、蛋白质和蔬菜比例，找出最容易调整的一项。",
      "xpReward": 24
    },
    {
      "type": "daily",
      "difficulty": "easy",
      "title": "激活髋膝踝关节",
      "description": "跑前完成一轮髋部、膝盖和脚踝活动，记录身体紧绷位置。",
      "xpReward": 15
    },
    {
      "type": "daily",
      "difficulty": "normal",
      "title": "记录有氧心率区间",
      "description": "完成当天有氧训练后，记录平均心率、主观疲劳和恢复感受。",
      "xpReward": 28
    },
    {
      "type": "boss",
      "difficulty": "boss",
      "title": "跑完递进配速路线",
      "description": "完成一次后半程略快于前半程的路线，并复盘配速是否稳定。",
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
  → 校验 npcMessage、任务数量、任务类型、任务难度、XP 范围和文本长度
  → 如标题模板化或格式化标签不合格，携带失败原因请求 DeepSeek 重新生成一次
  → 校验通过后保存该用户 API Key
  → 写入 ai_logs 和 tasks
  → 返回目标、任务列表与 NPC 文案
```

### 7.2 后端校验规则

1. DeepSeek 必须返回合法 JSON，结构为 `{ "npcMessage": string, "tasks": Task[] }`。
2. `tasks` 必须为 3 到 6 个。
3. 类型组合必须至少包含 1 个 `main` 和 1 个 `boss`；`daily` 为可选，最多 2 个；`side` 为可选，最多 2 个。
4. `difficulty` 必须是 `easy`、`normal`、`hard` 或 `boss`。
5. Boss 类型任务的 `difficulty` 必须为 `boss`，非 Boss 任务不能使用 `boss` 难度。
6. `xpReward` 必须由 DeepSeek 返回，后端校验为 5 到 220 的整数；每日任务经验通常偏低，但不强制固定映射。
7. 校验失败时不保存任务，首次传入的 API Key 也不会因为失败结果而保存。
8. DeepSeek 返回结果不满足规则时直接失败，不会回退到本地模板任务。
9. 标题不能包含冒号、字段标签或已知高频模板短语；描述不能包含“任务内容：”等字段标签格式。
10. 对可修复的模型格式问题，后端最多追加一次 DeepSeek 重新生成请求；重试仍不合格才返回错误。

### 7.3 失败处理

以下情况直接返回错误并中止任务生成：

1. 当前用户未配置 DeepSeek API Key。
2. DeepSeek API Key 格式明显不正确。
3. DeepSeek 请求超时、网络失败、余额不足、权限错误或频率限制。
4. DeepSeek 返回空内容、被截断内容或非 JSON 内容。
5. DeepSeek 返回的任务数量、类型、难度、XP 或文本不符合系统规则。

> 重要：任务类型组合和 XP 安全范围属于后端公共规则。模型负责生成标题、描述、类型、难度和具体 `xpReward`，最终写库前必须经过后端校验。

## 8. Prompt 迭代记录

| 版本 | 日期       | 变更说明                                         |
| ---- | ---------- | ------------------------------------------------ |
| v1   | 2026-07-10 | 初始版本，定义输入输出 Schema 和示例。   |
| v2   | 2026-07-10 | 接入 DeepSeek `deepseek-v4-flash`，补充用户级 API Key、JSON 模式和后端校验策略。 |
| v3   | 2026-07-10 | 移除本地模板兜底，改为 AI-only 生成；明确每日任务和目标通关规则。 |
| v4   | 2026-07-10 | 增加反模板标题约束，禁止字段标签式标题和“知识地图/实战小目标”等高频模板短语，并为可修复格式问题增加一次 AI 重新生成。 |
| v5   | 2026-07-10 | 放宽 daily 为可选任务，短期目标可不生成每日任务；改为模型生成 `xpReward`，后端只做范围校验，并提示每日任务经验偏低。 |
