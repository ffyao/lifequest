# 成员 C AI 任务书：AI 扩展、成就系统与测试素材

> 本任务书写给成员 C 的 AI 编程助手。请严格按本文档执行，重点增强 AI 特色、徽章文案和提交素材，不要破坏任务完成和 XP 计算逻辑。

## 1. 你的身份和目标

你是 LifeQuest 项目的 AI 内容和素材 AI。你的目标是让项目更符合“大模型编程”课程主题，并为答辩准备足够的 AI 过程佐证。

重点成果：

- 提供可直接接入大模型的 Prompt 文档。
- 丰富本地模板生成内容。
- 优化徽章和 NPC 文案。
- 完善截图素材清单。
- 更新协作文档中的 AI 使用记录。

## 2. 通用执行流程

开始前请先按 `member-tasks/AI协作总则.md` 完成 SSH、clone、分支、基线测试检查。

你的工作分支是：

```text
feature/ai-badges
```

本任务书只描述你的模块目标、文件范围和验收标准；Git 命令、提交、推送、PR 规则均以 `member-tasks/AI协作总则.md` 为准。

## 3. 你优先修改的文件

```text
server/services/aiService.js
docs/协作文档.md
docs/审查报告.md
screenshots/README.md
member-tasks/03-成员C-AI扩展成就系统与测试素材.md
```

可以新增：

```text
docs/AI-Prompt设计.md
docs/截图清单.md
```

谨慎修改：

```text
server/services/database.js
server/services/badgeService.js
```

禁止修改：

```text
server/services/gameService.js
server/services/taskService.js
server/services/api.js
client/app.js
```

## 4. 任务 C1：新增 AI Prompt 设计文档

新增：

```text
docs/AI-Prompt设计.md
```

文档必须包含：

- Prompt 目标。
- 输入字段。
- 输出 JSON Schema。
- 完整 Prompt 示例。
- 学习类目标示例输出。
- 健身类目标示例输出。
- AI 输出失败时的兜底策略。

输出 JSON 必须兼容当前任务结构：

```json
{
  "npcMessage": "勇者，今天的副本已经开启。",
  "tasks": [
    {
      "type": "main",
      "difficulty": "normal",
      "title": "任务标题",
      "description": "任务描述",
      "xpReward": 40
    }
  ]
}
```

## 5. 任务 C2：丰富本地模板

修改：

```text
server/services/aiService.js
```

要求：

- 保留现有 `templates` 结构。
- 每类至少保留 5 个任务。
- 每类至少 4 条 NPC 文案。
- 可以增加关键词。
- 不要改变 `generateTasks` 返回结构。
- 不要让 `npm test` 失败。

当前分类：

```text
学习
健身
阅读
创作
生活
```

建议扩展：

```text
考试
编程
英语
减脂
早睡
写作
```

可以通过关键词映射到现有分类，不一定新增大分类。

## 6. 任务 C3：优化徽章内容

如需修改徽章文案，优先修改：

```text
server/services/database.js
```

可以优化：

```text
徽章名称
徽章说明
Emoji 图标
```

不要轻易新增复杂解锁条件。若新增条件，必须同步修改：

```text
server/services/badgeService.js
```

并补充测试说明。

## 7. 任务 C4：完善截图清单

更新：

```text
screenshots/README.md
```

或新增：

```text
docs/截图清单.md
```

必须列出：

```text
01-需求分析-AI交互.png
02-选题讨论-AI交互.png
03-架构设计-AI交互.png
04-代码生成-AI交互.png
05-代码审查-AI交互.png
06-Gitee协作截图.png
07-首页截图.png
08-副本看板截图.png
09-任务生成截图.png
10-任务完成截图.png
11-徽章墙截图.png
12-排行榜截图.png
```

每张截图说明用途：放在哪份文档或 PPT 哪一页。

## 8. 任务 C5：更新协作文档

更新：

```text
docs/协作文档.md
```

补充：

- 使用 Gitee SSH 协作。
- 使用成员 AI 分工开发。
- 每个成员 AI 的任务边界。
- AI Prompt 迭代如何记录。
- AI 审查和截图如何作为过程佐证。

## 9. 提交前检查

按 `member-tasks/AI协作总则.md` 执行通用提交前检查。

额外要求：如果你修改了本任务书列出的页面或服务，请在最终回复中说明人工检查结果或未检查原因。

## 10. 最终回复给成员的内容

完成后必须输出：

```text
完成内容：
修改文件：
测试结果：
新增 Prompt 或模板：
截图素材建议：
是否改动公共结构：
需要组长注意：
```
