# 第三方软件与内容

项目原创代码采用 MIT。第三方组件仍遵循各自许可证，不能用本项目 LICENSE 替代它们。

主要组件包括 React、Vite、Supabase JS、TanStack Query、Radix UI、Lucide、Recharts、Tailwind CSS，以及 SheetJS Community Edition。SheetJS CE 采用 Apache-2.0；其余依赖的具体版本、许可证与原始声明以发布包的 `third-party/inventory.json` 及对应目录为准。

`npm run release:prepare` 从实际安装的依赖复制 LICENSE、COPYING、NOTICE 等文件，包括开发依赖；发布前检查 UNKNOWN 项，并保留依赖已有声明。这里不声明第三方代码的所有权。

发布包不包含原 NoCode 运行时、图标、个人表格、招聘数据、薪资统计或第三方文章。导入这些内容只代表你本人有权读取，不代表有权再发布。MIT 授权仅覆盖本项目有权授权的代码，不自动授权飞书表格、公司商标或招聘内容。

SheetJS 使用[官方分发包](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/)，不使用已停止更新的 npm 0.18.5 版本。
