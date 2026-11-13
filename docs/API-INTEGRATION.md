# 前端接入现有核验服务

当前版本只实现前端对接，不部署模型后端。默认 API 根路径为 `/api`，站点不会用模拟数据补齐失败的请求。

## 本地开发

```sh
cp .env.example .env.local
npm run dev
```

Vite 将 `/api/*` 原样转发至 `QINAN_API_PROXY_TARGET`（默认 `http://127.0.0.1:8010`）。运行原后端后即可联调。此代理只在开发服务器生效。

## 生产部署

推荐前端和 API 同源：将 `/api/*` 反向代理到后端，其他请求提供 `dist/` 静态文件。

API 位于其他域时，在构建前设置 `VITE_API_BASE_URL=https://your-api.example/api` 后重新 `npm run build`。后端需允许前端域的 CORS；HTTPS 站点需连接 HTTPS API。`VITE_` 变量会进入公开浏览器代码，不能放密钥。当前客户端使用浏览器默认的同源凭证行为，不包含独立登录或跨域 Cookie 登录方案。

GPT Site 当前是静态部署，尚无可访问后端；仅设置 Vite 开发代理不会让线上 Site 连接本机服务。需提供可访问 API 并重新构建，或将前端部署到现有后端的同源域。

## 使用的接口

| 方法 | 路径（相对 API 根路径） | 请求 / 响应 |
| --- | --- | --- |
| POST | `/analyze` | FormData：`file`、`scene`（聊天截图为 `chat`，其余为 `general`）、`context`（当前为空字符串）；返回 `{job_id: string}` |
| GET | `/jobs/:job_id` | 返回 `status` 和可选 `message`；`completed` 时 `result` 为报告，`failed` 时显示失败 |
| GET | `/cases` | 返回记录数组，或 `{items: [...]}` / `{cases: [...]}`；每项需有字符串 `id` |
| GET | `/cases/:id` | 直接返回报告对象，需有字符串 `id` |

报告支持 `modules`、`summary`、`next_steps`、`chat_analysis` 和 `ocr.text`。模块阈值按服务返回值判断，缺省提醒线为原契约中的 `0.5`；分段与二次检查使用各自提供的阈值。未完成或缺少分值的模块不当作“安全”。摘要与原始记录均保留，完整 JSON 可下载和打印。

## 请求与恢复

- 上传不自动重试，防止重复创建任务；提交超时提醒先检查历史。
- 已获得编号的任务会绑定 API 来源保存在会话存储中；恢复只轮询，不重新上传。切换 API 来源后不恢复另一来源的任务。
- 轮询失败三次后保留任务，允许手动恢复；404 清理失效任务。视图切换会取消该视图的读取，上传任务可继续完成。
- 非 JSON、无效任务/报告、网络异常和超时显示明确错误；选中的材料留在当前页面供重试，不写入本地存储。
- `qinan-contacts` 和动效偏好保留。旧 `qinan-demo-history` 不混入真实核验记录，旧深链接仍标为旧版示例。

回归使用受控接口响应验证前端契约；尚未与真实模型服务联调。
