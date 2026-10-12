# 部署自己的实例

默认方案是 GitHub Pages 托管静态前端，Supabase 提供登录和数据库。每人使用自己的 GitHub 仓库和 Supabase 项目；维护者不接收你的求职记录。

## 1. 创建后端

在 Supabase 创建一个全新项目，确认账户套餐、区域与可能的费用。本项目不会自动创建付费资源。

在 SQL Editor 执行 `deploy/schema.sql`。它在一个事务内创建完整结构，并拒绝已有 public 业务表的数据库。不要把它用于原有站点升级，也不要额外执行旧版本迁移目录。

在 Authentication 中创建你的邮箱密码账号，并关闭 Allow new users to sign up。前端不提供注册入口，但隐藏入口不能替代关闭后端注册。设置 Auth Site URL 为最终站点地址。

只关闭公开注册，保留 Email 登录提供者启用；关闭 Email provider 会导致已有账号也无法用邮箱密码登录。若使用当前 Supabase CLI 配置，设置全局 `auth.enable_signup=false`，保留 `auth.email.enable_signup=true`，并通过实际注册请求确认注册被拒绝。

已登录 Supabase CLI 的 AI 也可以使用 `npx supabase@latest db query --linked --project-ref YOUR_PROJECT_REF --file deploy/schema.sql` 初始化空库。必须显式指定新项目，先查询确认空库，不使用默认链接的旧项目。SQL 的空库保护仍会生效。

获取项目 URL 与 anon/publishable key。不要使用 service_role 或 secret key。

也可以让 AI 运行初始化脚本：

```sh
npm run deploy:database -- YOUR_PROJECT_REF
npm run deploy:database -- YOUR_PROJECT_REF --apply
```

第一条只预览。第二条需要进程环境中的 SUPABASE_ACCESS_TOKEN，会写入指定的新项目；授权前确认项目。脚本调用 Supabase Management API，不记录响应正文或令牌；API 不可用时使用 SQL Editor。该[查询接口仍处于 Beta](https://supabase.com/docs/reference/api/v1-run-a-query)，不能承诺一直可用。

## 2. 部署前端

把经审查的开源源码放在你自己的仓库。新用户可以 Fork；原项目维护者应使用干净发布包新建仓库，不直接公开带私人历史的仓库。

在 GitHub Settings → Secrets and variables → Actions → Variables 设置：

| 变量 | 必需 | 含义 |
| --- | --- | --- |
| VITE_SUPABASE_URL | 是 | 你的 Supabase 项目地址 |
| VITE_SUPABASE_ANON_KEY | 是 | anon 或 publishable key，构建后公开 |
| VITE_ENABLE_FEISHU | 否 | 默认 false；只有完成可选飞书配置后才设 true |

Settings → Pages → Source 选择 GitHub Actions，运行 “Deploy personal Job Desk”。工作流使用 Pages 提供的项目路径构建，HashRouter 不需要服务器路由改写。变量缺失时不部署。工作流会运行代码检查、单元测试、空库测试和构建。

已登录 GitHub CLI 时，AI 可使用 `npm run deploy:pages -- OWNER/REPO` 预览，获准后加 `--apply`。该脚本从进程环境读取上述前端变量，配置仓库与 Pages；它不提交、不上传、不改变仓库公开性，也不触发部署。变量设置成功而 Pages 失败时，检查权限后重新运行。

Pages 的账户和仓库可用条件以[GitHub 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)为准。Supabase 额度、暂停策略与价格由平台决定，本项目不保证永久免费或持续可用。

## 3. 验收

打开 Actions 输出的站点，登录；添加虚构投递、编辑和刷新；检查看板、日历、流程、放弃与恢复、CSV。导入模板数据，点击去投递并确认，刷新后仍应存在。删除测试记录后，来源岗位应回到待投递池。未登录不能读取记录。

上述云端验收不能由本地构建或隔离数据库测试替代。通过后再使用真实数据。

## 本地与维护

### 已有实例的同步锁权限修复

尚未包含本次同步锁权限修复的已有实例，应在自己的 Supabase SQL Editor 执行
`deploy/upgrades/202610120001_restrict_feishu_sync_rpc.sql`（或用 CLI 显式指定自己的 project-ref）。
这是独立、可重复执行的权限补丁，不删除记录；不要在旧库重跑空库初始化脚本。
它撤销匿名及登录用户对两个服务端同步锁 RPC 的执行权限，保留 service_role。
即使未启用飞书，也应应用补丁。新实例的 `deploy/schema.sql` 已包含修复。

### CSV 导出说明

导出会在疑似公式开头的文本前添加制表符，并转义引号、逗号及换行，降低 Excel 打开 CSV 时的公式注入风险；只改变导出文件，不改动数据库原文。无效日期导出为空。
制表符会成为单元格内容的一部分，供程序导入时须考虑这一差异。不同表格软件和重新保存后的处理可能不同，不能将其视为所有软件下的通用安全保证；不要执行或启用不可信内容中的公式。参见 [OWASP CSV Injection](https://community.owasp.org/attacks/CSV_Injection)。

使用 Node.js 24，复制 .env.example 为 .env.local，仅填写前端公开变量；新实例保留 VITE_ENABLE_FEISHU=false。运行 `npm ci`、`npm run dev`，访问 http://localhost:8080。开发服务器只监听本机，不用作长期线上服务。

每次修改远端前确认项目与授权范围。先导出 CSV，必要时使用 Supabase 数据库备份；CSV 不包含全部面试流程，不能当完整恢复备份。不要把导出的个人数据推到 GitHub。
