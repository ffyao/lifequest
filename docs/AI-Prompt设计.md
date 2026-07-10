# LifeQuest AI Prompt 设计文档

> 本文档记录 LifeQuest 任务生成 AI 的 Prompt 设计思路、输入输出规范、示例和兜底策略。可直接用于接入真实大模型接口，也可作为本地模板的设计参考。

## 1. Prompt 目标

将用户输入的长期目标（如"30 天掌握 Vue 开发"）拆解为一组结构化的 RPG 副本任务，包含主线、支线、每日和 Boss 任务，并返回一段 NPC 引导文案，让用户有"进入副本"的游戏代入感。

具体目标：

- 根据目标标题、描述和分类，自动识别目标领域（学习、健身、阅读、创作、生活等）。
- 生成 5 个任务，覆盖 main / side / daily / boss 四种类型。
- 每个任务标注难度（easy / normal / hard / boss）和对应 XP 奖励。
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

AI 必须返回以下 JSON 结构，字段名和层级与 `aiService.generateTasks` 返回值保持一致：

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
      "minItems": 5,
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
            "description": "经验值奖励，需与难度匹配",
            "enum": [20, 40, 80, 150]
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
side   支线任务，辅助准备或资料收集
daily  每日任务，可重复执行的小步行动
boss   Boss 任务，阶段性高难度挑战
```

## 4. 完整 Prompt 示例

### 4.1 系统提示词（System Prompt）

```text
你是 LifeQuest 人生副本系统的 AI 任务生成引擎。用户会输入一个现实中的长期目标，你需要把它拆解为一组 RPG 风格的副本任务。

规则：
1. 识别目标所属领域（学习、健身、阅读、创作、生活）。
2. 生成恰好 5 个任务，类型覆盖 main、side、daily、boss。
3. 每个任务包含 type、difficulty、title、description、xpReward 五个字段。
4. difficulty 与 xpReward 必须匹配：easy=20，normal=40，hard=80，boss=150。
5. 返回一条 npcMessage，风格为 RPG 向导的鼓励语，不超过 40 字。
6. 仅输出 JSON，不要输出任何解释或 Markdown 代码块标记。
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
    { "type": "main", "difficulty": "normal", "title": "...", "description": "...", "xpReward": 40 }
  ]
}
```

### 4.3 调用示例（伪代码）

```javascript
const response = await fetch('https://api.example-llm.com/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `请为以下目标生成副本任务：\n目标标题：${goal.title}\n目标描述：${goal.description}\n目标分类：${goal.category}` }
    ],
    temperature: 0.8,
    response_format: { type: 'json_object' }
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
      "difficulty": "hard",
      "title": "完成一个实战小作品",
      "description": "用 JavaScript 完成一个可展示的 DOM 交互小 Demo。",
      "xpReward": 80
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
      "difficulty": "hard",
      "title": "完成周度挑战跑",
      "description": "完成一次比平时更长距离或更高配速的挑战跑。",
      "xpReward": 80
    }
  ]
}
```

## 7. AI 输出失败时的兜底策略

当前项目使用本地模板兜底，保证即使没有真实大模型也能正常生成任务。兜底逻辑位于 `server/services/aiService.js` 的 `generateTasks` 方法中。

### 7.1 兜底触发条件

以下任一情况触发本地模板兜底：

1. 未配置大模型 API Key（当前默认状态）。
2. 大模型接口请求超时或网络异常。
3. 大模型返回内容无法解析为合法 JSON。
4. JSON 结构不符合 Schema（缺少字段、tasks 数量不足、xpReward 不匹配等）。

### 7.2 兜底流程

```text
用户创建目标
  → pickCategory(goal) 根据关键词匹配分类
  → 命中分类 → 使用该分类模板
  → 未命中   → 使用 goal.category，若仍无匹配则回退到"生活"
  → 从模板取出 5 个任务 + 随机选 1 条 NPC 文案
  → 写入 ai_logs 表（model 字段记为 local-template-v1）
  → 返回结果
```

### 7.3 本地模板覆盖分类

```text
学习  编程、考试、课程、英语、数学、算法
健身  跑步、减脂、增肌、运动、体重
阅读  读书、书籍、小说
创作  写作、视频、自媒体、绘画、设计
生活  早睡、自律、整理、习惯、时间
```

### 7.4 扩展真实大模型的建议

如后续接入真实大模型，建议在 `aiService.js` 中增加以下逻辑：

1. 优先调用大模型接口，设置 10 秒超时。
2. 解析返回 JSON 并校验 Schema。
3. 校验失败时，回退到本地模板，并在 `ai_logs.model` 中标记 `fallback-after-llm`。
4. 大模型返回的 npcMessage 和 tasks 直接透传，不修改 XP 规则。
5. 在 `ai_logs` 中记录原始大模型返回内容，便于调试和 Prompt 迭代。

> 重要：无论是否接入大模型，XP 规则（easy=20, normal=40, hard=80, boss=150）和任务类型（main/side/daily/boss）属于公共结构，不可由 AI 单方面改变。如需调整须先与组长确认。

## 8. Prompt 迭代记录

| 版本 | 日期       | 变更说明                                         |
| ---- | ---------- | ------------------------------------------------ |
| v1   | 2026-07-10 | 初始版本，定义输入输出 Schema、示例和兜底策略。   |
