# 贡献

项目目标是个人求职管理，不包含公共注册、团队协作、自动代投或支付。

本地使用 Node.js 24，运行 `npm ci`。修改前保留已有变更；只用虚构数据测试，不提交 .env.local 或个人截图。

前端改动运行 `npm run lint`、`npm test`、`npm run test:schema`、`npm run build`。界面或请求流程还需浏览器验收。数据库变更保留升级迁移，同时更新新实例 `deploy/schema.sql`；初始化 SQL 不用于升级旧实例。

提交贡献即表示你有权提供这些内容，并同意按项目 MIT 许可证分发。第三方代码保留原始许可证与声明。
