# 飞书同步（可选）

不启用飞书也能登录、手动添加投递记录、导入 Excel、使用看板与日历、管理面试流程和导出 CSV。新部署默认关闭飞书入口，避免请求未部署的函数。

启用后，从你有阅读权限的一份飞书电子表格同步岗位。当前只支持固定列结构的 Sheets，不是多维表格 Bitable，也不是任意飞书文档读取器。不会自动发现其他文件，不会扩大你的阅读权限。

## 使用条件

创建自己的飞书开放平台应用，并确认组织允许该应用与 OAuth。申请 `sheets:spreadsheet:readonly` 和 `offline_access`。使用用户 OAuth；应用身份不保证能读取其他组织的表格。

部署以下两个 Supabase Edge Functions，均保留函数内部鉴权：

```sh
npx supabase@latest functions deploy feishu-oauth-callback --project-ref YOUR_PROJECT_REF --no-verify-jwt
npx supabase@latest functions deploy sync-feishu --project-ref YOUR_PROJECT_REF --no-verify-jwt
```

在 Supabase Edge Function Secrets 设置：

| 变量 | 用途 |
| --- | --- |
| OWNER_EMAIL | 此实例唯一使用者的登录邮箱 |
| FEISHU_APP_ID、FEISHU_APP_SECRET | 你自己的飞书应用凭据 |
| FEISHU_SPREADSHEET_TOKEN、FEISHU_SHEET_ID | 你有权访问的电子表格与工作表 |
| FEISHU_OAUTH_REDIRECT_URI | https://YOUR_PROJECT_REF.supabase.co/functions/v1/feishu-oauth-callback |
| APP_URL | 完整站点地址，GitHub Pages 项目路径也要包含；本地为 http://localhost:8080 |
| FEISHU_IGNORED_REFERENCE_URL | 可选，来源误把公共参考文档当投递官网时，配置需忽略的参考链接 |
| SYNC_CRON_SECRET | 只有自行启用计划任务时需要；本版不自动安排定时同步 |

Supabase Runtime 提供的 SUPABASE_* 服务密钥不应复制到前端。飞书开放平台的回调白名单必须与上述回调一致。将 GitHub Repository Variable `VITE_ENABLE_FEISHU` 设为 `true` 后重新构建，登录岗位池点击“连接飞书”，授权后点击同步。

## 数据流与限制

前端只向 Edge Function 发出带登录 JWT 的连接或同步请求。服务端使用一次性 state 完成 OAuth，把 refresh_token 存在前端无权读取的表中。同步函数刷新短期 user_access_token，读取 A:K 的分页范围，使用你的筛选设置，将结果写入你自己的岗位池。令牌不回传浏览器。

列顺序与 Excel 模板一致。没有年份的日期按同步时年份处理；跨年数据请填完整年份。非提前批默认归类为“秋招正式批”，这是当前批次模型的限制。重复同步不覆盖岗位的置顶或暂不投递标记；手动修改备注可能被来源备注更新覆盖。

取消使用时，关闭前端开关、在飞书侧撤销授权，并由实例管理员清除自己项目中的 OAuth 连接。不要对不属于自己的表格执行批量抓取或再发布。
