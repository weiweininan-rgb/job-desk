# 让 AI 协助部署

把以下请求交给能访问本地文件与终端的 AI。登录、平台授权、资源费用与最后验收仍由你确认。不要把密码或管理令牌粘贴进聊天。

> 请阅读 README.md 和 docs/DEPLOYMENT.md，帮我在自己的 GitHub Pages 与 Supabase 上部署 Job Desk。先检查 Node.js 24、npm 和 GitHub CLI，不读取或输出已有 .env.local。默认不启用飞书。
>
> 我会提供目标 GitHub 仓库、全新 Supabase project ref，以及前端公开 URL/key。管理访问令牌只通过受控进程环境提供。不要使用原作者的项目、账号、表格或真实数据。
>
> 先运行 npm ci、lint、单元测试、test:schema 和 build；检查 LICENSE、第三方声明及代码中有无私人配置。初始化前确认数据库是新项目，公开、推送、修改仓库配置或执行 --apply 前确认目标和授权；不得自动创建付费资源。
>
> 使用 deploy:database 和 deploy:pages 的预览模式报告计划。得到我对具体对象的授权后执行，并帮助我在控制台创建唯一登录账号、关闭公开注册和设置 Site URL。上传源码后运行 Pages 工作流，核对部署状态与站点地址。
>
> 用虚构数据完成 docs/RELEASE_CHECKLIST.md 的浏览器验收。区分本地通过、远端部署和真实页面验证；缺少授权或遇到平台限制时交付已完成内容和最小解阻条件。飞书仅在我另行要求时按 docs/FEISHU.md 配置。

这套流程自动化依赖安装、校验、空库初始化和前端配置，但不能绕过平台登录、人工授权或套餐限制。没有 SUPABASE_ACCESS_TOKEN 时可人工运行 SQL Editor，不影响核心功能。
