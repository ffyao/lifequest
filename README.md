# LifeQuest 人生副本任务系统

LifeQuest 是一个游戏化目标管理 Web 应用。用户可以创建人生角色、填写长期目标，系统使用 DeepSeek 生成主线、每日、Boss 和可选支线副本任务。用户完成任务后获得经验值、提升等级并解锁徽章。

## 技术栈

- 前端：原生 HTML/CSS/JavaScript 单页应用原型
- 后端：Node.js HTTP Server
- 数据库：Node.js 内置 SQLite
- AI：DeepSeek `deepseek-v4-flash` 对话补全接口，用户级 API Key 配置

## 快速启动

```bash
npm run dev
```

启动后访问：

```text
http://localhost:3000
```

注意：本地开发服务是 HTTP，不要使用 `https://localhost:3000`。如果浏览器提示 `SSL_ERROR_RX_RECORD_TOO_LONG`，请确认地址栏是 `http://localhost:3000`。

## 测试

```bash
npm test
```


## AI 任务生成

- 任务生成调用 DeepSeek `deepseek-v4-flash` 模型。
- 副本任务只能由 AI 生成，后端不再提供本地模板兜底。
- 每个用户首次生成副本任务前需要配置自己的 DeepSeek API Key。
- 前端目标生成区提供 API Key 输入框，占位文本为 `请配置deepseek apikey（前往platform.deepseek.com）`。
- API Key 只提交给后端保存，前端不会展示已保存的密钥内容。
- 后端会校验 DeepSeek 返回结果，只有满足 `3` 到 `6` 个任务，且至少包含 `1` 个主线、`1` 个每日、`1` 个 Boss 的结果才会写入任务表；支线任务为可选。
- 每日任务每天可完成一次；目标通关进度只取决于主线和 Boss，全部完成后该目标下所有按钮显示为“已通关”。

## 开发维护

后续开发由组长单人完成，历史分工文档已删除。维护规则见：

```text
AGENTS.md
CONTRIBUTING.md
```

推荐分支：

```text
main
dev
```

## 默认测试账号

```text
用户名：demo
密码：demo123
```

管理员账号：

```text
用户名：admin
密码：admin123456
```

默认高级激活码：

```text
LIFEQUEST-ADV-300
```

注册新账号必须填写激活码。高级激活码最多可激活 300 个账号；普通激活码只能激活 1 个账号。

访问系统时默认先显示登录页。登录成功后会话有效期为 7 天，可以通过顶部“退出登录”按钮注销。

## 核心演示流程

```text
登录 demo 账号
→ 查看人生角色
→ 输入长期目标
→ 生成副本任务
→ 在目标列表中选择目标
→ 进入任务中心并完成任务
→ 查看 XP、等级、徽章变化
```
