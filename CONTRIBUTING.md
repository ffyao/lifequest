# LifeQuest 维护说明

本项目后续由组长单人维护，历史分工文档已删除。

## 仓库地址

```text
Gitee SSH：git@gitee.com:tidehope/lifequest.git
Gitee Web：https://gitee.com/tidehope/lifequest
```

本机已配置 SSH，保持使用 SSH 远程地址，不要改成 HTTPS。

## 分支建议

```text
main    稳定主分支
dev     日常开发与集成分支
```

后续开发可以直接在 `dev` 上进行；较大功能也可以临时创建 `feature/*` 分支，完成后合并回 `dev`。

## 提交前检查

```bash
node --check server/services/aiService.js
node --check server/services/taskService.js
node --check server/services/api.js
node --check server/services/gameService.js
node --check client/app.js
git diff --check
npm test
```

如果改动了文档或 UI，请同步检查 `README.md`、`docs/操作手册.md`、`docs/API接口规范.md` 和 `docs/AI-Prompt设计.md` 是否需要更新。

## 注意事项

- 不提交真实 API Key、Token 或个人敏感信息。
- 不在前端写入默认账号、管理员密码或激活码等内部信息。
- DeepSeek API Key 由用户在生成任务前自行配置，前端只显示是否已配置。
- 任务完成必须保持幂等：已完成任务不能重复获得 XP。
