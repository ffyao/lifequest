# LifeQuest 人生副本任务系统

LifeQuest 是一个游戏化目标管理 Web 应用。用户可以创建人生角色、点击头像选择图片文件作为头像，填写目标后由 DeepSeek 生成主线、Boss、可选每日和可选支线副本任务。用户完成任务后获得经验值、提升等级并解锁徽章。

## 技术栈

- 前端：原生 HTML/CSS/JavaScript 单页应用原型
- 后端：Node.js HTTP Server
- 数据库：Node.js 内置 SQLite
- AI：DeepSeek `deepseek-v4-flash` 对话补全接口，管理员全局 API Key 配置

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

## 部署方法

### 本地演示部署

```bash
git clone git@gitee.com:tidehope/lifequest.git
cd lifequest
npm install
npm run dev
```

访问：

```text
http://localhost:3000
```

### Linux 服务器部署

适用于支持 Node.js `>= 22.5.0` 且具有持久磁盘的服务器：

```bash
git clone git@gitee.com:tidehope/lifequest.git
cd lifequest
npm install
PORT=3000 npm start
```

后台运行示例：

```bash
nohup npm start > lifequest.log 2>&1 &
```

部署注意事项：

- SQLite 数据库文件位于 `server/data/lifequest.sqlite`，部署环境需要保证该目录可写且持久化。
- 生产演示建议通过 Nginx 或平台网关反向代理到 Node.js 端口。
- DeepSeek API Key 由管理员登录后在“系统配置”页保存，不要写入前端代码或提交到仓库。
- 如果部署平台不支持持久文件系统，建议改用 MySQL、PostgreSQL 或其他外部数据库。


## AI 任务生成

- 任务生成调用 DeepSeek `deepseek-v4-flash` 模型。
- 副本任务只能由 AI 生成，后端不再提供本地模板兜底。
- DeepSeek API Key 由管理员在“系统配置”页统一配置，普通用户无需填写密钥。
- API Key 只保存在服务端全局配置中，前端不会展示已保存的密钥内容。
- 后端会校验 DeepSeek 返回结果，只有满足 `3` 到 `6` 个任务，且至少包含 `1` 个主线和 `1` 个 Boss 的结果才会写入任务表；每日任务和支线任务为可选。
- 短期目标、一次性目标或冲刺型目标允许不生成每日任务；长期目标和习惯养成目标可以生成每日任务。
- DeepSeek 需要为每个任务返回 `xpReward`，后端只做范围与整数校验；每日任务经验通常偏低，但具体数值由 AI 根据任务行动成本决定。
- 每日任务每天可完成一次；目标通关进度只取决于主线和 Boss，全部完成后该目标下所有按钮显示为“已通关”。

## 协作与维护

项目采用小组分工、Gitee 分支协作和 AI Coding 辅助开发。成员在功能分支完成模块开发后，由组长合并、审查、测试和整理最终展示版本。协作流程、维护说明和课程材料见：

```text
AGENTS.md
CONTRIBUTING.md
docs/开发流程.md
docs/协作文档.md
docs/审查报告.md
```

推荐分支：

```text
main  稳定展示分支
dev   日常开发与验证分支
```


## 文档导航

```text
docs/操作手册.md      本地运行、登录注册、功能演示步骤
docs/API接口规范.md   后端接口、请求响应和错误码
docs/架构设计.md      模块划分、数据库表和核心流程
docs/规格说明.md      项目范围、功能需求和非功能需求
docs/AI-Prompt设计.md DeepSeek 任务生成 Prompt 和校验规则
docs/开发流程.md      小组分工、分支协作、验证和发布流程
docs/协作文档.md      成员分工、分支贡献、AI Coding 使用记录
docs/审查报告.md      代码审查问题与修复记录
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
→ 在任务看板点击头像选择图片文件
→ 输入目标
→ 生成副本任务
→ 在目标列表中选择目标
→ 进入任务中心并完成任务
→ 查看 XP、等级、徽章和排行榜头像变化
```
