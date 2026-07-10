# LifeQuest AI Agent Instructions

This repository is now maintained by the project leader only. Historical member task prompts have been removed.

## Read First

Before changing code, read these files when relevant:

1. `README.md`
2. `docs/架构设计.md`
3. `docs/API接口规范.md`
4. `docs/操作手册.md`
5. `docs/AI-Prompt设计.md` for AI task generation changes

## Core Flow Guardrail

Do not break the core demo flow:

```text
login or register
→ load character
→ configure DeepSeek API Key when needed
→ generate tasks
→ display task list
→ complete task
→ XP/level updates
→ badges/ranking display
```

If a change affects API paths, database fields, XP rules, badge rules, authentication, or task generation, update the related docs and tests in the same change.
