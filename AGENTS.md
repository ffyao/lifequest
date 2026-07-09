# LifeQuest AI Agent Instructions

This repository is a four-person AI Coding course project. If you are a member's AI coding assistant, do not infer workflow rules from this file alone.

## Read First

Read these files in order:

1. `member-tasks/AI协作总则.md`
2. `member-tasks/00-项目统一说明.md`
3. Your assigned task file:
   - Member A: `member-tasks/01-成员A-前端页面与游戏化视觉.md`
   - Member B: `member-tasks/02-成员B-后端基础业务模块.md`
   - Member C: `member-tasks/03-成员C-AI扩展成就系统与测试素材.md`

## Source of Truth

`member-tasks/AI协作总则.md` is the single source of truth for Git, SSH, branch, validation, commit, push, PR, and forbidden-action rules.

If any other prompt or task file appears shorter, older, or inconsistent, follow `member-tasks/AI协作总则.md` and mention the inconsistency in your final response.

## Core Flow Guardrail

Do not break the core demo flow:

```text
login demo user
→ load character
→ generate tasks
→ display task list
→ complete task
→ XP/level updates
→ badges/ranking display
```

If your task requires changing API paths, database fields, XP rules, badge rules, or project architecture, stop and ask the group leader first.
