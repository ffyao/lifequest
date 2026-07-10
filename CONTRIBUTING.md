# LifeQuest 维护说明

本项目是小组 AI Coding 作业，前期采用功能分支协作，后期由组长统一集成、修复和整理最终展示版本。团队分工见 `docs/协作文档.md`，完整流程见 `docs/开发流程.md`。

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
node --check client/app.js
node --check server/services/api.js
node --check server/services/aiService.js
node --check server/services/taskService.js
node --check server/services/gameService.js
node --check server/services/userService.js
node --check server/tests/core-flow.test.js
git diff --check
npm test
```

如果改动了文档或 UI，请同步检查 `README.md`、`docs/操作手册.md`、`docs/API接口规范.md` 和 `docs/AI-Prompt设计.md` 是否需要更新。

## 推送 main 前检查

`main` 用作稳定展示分支。推送前先在 `dev` 运行完整检查，再合并到 `main`：

```bash
git checkout dev
npm test
git checkout main
git merge dev
git push origin main
```

## 注意事项

- 不提交真实 API Key、Token 或个人敏感信息。
- 不在前端写入默认账号、管理员密码或激活码等内部信息。
- DeepSeek API Key 由管理员在系统配置页统一配置，前端不显示密钥明文。
- 任务完成必须保持幂等：主线、支线、Boss 不能重复获得 XP；每日任务同一天不能重复获得 XP。
- 用户名使用注册用户名，不提供修改入口；头像必须来自图片文件生成的 `data:image/...` 数据。
