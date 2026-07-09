# LifeQuest AI Agent Instructions

This repository is a four-person AI Coding course project. If you are a member's AI coding assistant, follow these rules before editing.

## Required Reading

Read these files first:

```text
member-tasks/AI协作总则.md
member-tasks/00-项目统一说明.md
CONTRIBUTING.md
```

Then read the task file for your assigned member:

```text
member-tasks/01-成员A-前端页面与游戏化视觉.md
member-tasks/02-成员B-后端基础业务模块.md
member-tasks/03-成员C-AI扩展成就系统与测试素材.md
```

## Git Rules

- Use SSH remote: `git@gitee.com:tidehope/lifequest.git`.
- The member accounts have been added to the Gitee repository as administrators.
- Use each member account's SSH setup to connect to Gitee. Do not switch the remote to HTTPS.
- Work only on your assigned feature branch.
- Do not push directly to `main` or `dev`.
- Do not use `git push --force`.
- Do not use `git reset --hard` unless the human explicitly requests it.
- Do not commit `server/data/*.sqlite`.

## Validation

Before editing:

```bash
npm test
```

Before committing:

```bash
npm test
git status --short
git diff --stat
```

If you change the frontend, also run:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Scope Control

Do not break this core flow:

```text
login demo user
→ load character
→ generate goal tasks
→ display task list
→ complete task
→ XP/level changes
→ badges and ranking display
```

If your task requires changing API paths, database fields, XP rules, badge rules, or project architecture, stop and ask the group leader first.
