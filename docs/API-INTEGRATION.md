# 前端接入现有核验服务（v14）

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
| POST | `/analyze` | FormData：`file`、`scene`（聊天截图为 `chat`，其余为 `general`）、`context`（当前为空字符串）；返回 `{job_id: string, events_url?: string}` |
| GET | `/jobs/:job_id` | 返回 `status` 和可选 `message`；`completed` 时 `result` 为完整报告；`failed` / `cancelled` / `expired` 明确终止 |
| GET | `/cases` | 返回记录数组，或 `{items: [...]}` / `{cases: [...]}`；每项需有字符串 `id` |
| GET | `/cases/:id` | 直接返回报告对象，需有字符串 `id` |

报告支持 `modules`、`summary`、`next_steps`、`chat_analysis` 和 `ocr.text`。模块阈值按服务返回值判断，缺省提醒线为原契约中的 `0.5`；分段与二次检查使用各自提供的阈值。未完成或缺少分值的模块不当作“安全”。摘要与原始记录均保留，完整 JSON 可下载和打印。

## 字段与运行时校验

输入由 `src/contracts.ts` 集中校验；类型化定义不是替代网络数据检查。新增校验可能拒绝以前被模板静默忽略的坏数据，后端请按以下约定返回。

- job/report/list 的标识符须为非空字符串，不能是 `.` 或 `..`。数字 ID 请在服务端转换成稳定字符串。
- `job.status` 接受 queued/pending、processing/running/analyzing、completed/succeeded、failed/error、cancelled/canceled、expired；别名归一化。未知状态明确报协议错误，不再无限当作处理中。
- 报告必须直接有 `id`；详情不能只包一层 `{result: ...}`。任务 completed 则必须把完整报告放在 `result` 中。
- `summary`、`name`、`filename`、`date`、`created_at` 等若存在必须为字符串；`next_steps` 必须为字符串数组。
- `modules` 可为模块对象映射或模块数组。模块 score/threshold/sensitivity_threshold/analyzed_seconds、分段的 score/threshold/start/end、secondary_check 的数值必须为有限 number，不接受数字字符串。
- 模块 status/type/note 为可选字符串，disabled 为可选 boolean；segments 为对象数组；secondary_check 为对象或 null。模块字段缺失时允许显示“未形成判断”，不自动补成功状态。
- `chat_analysis` 为对象，assessment 的 title/summary、signals 中的 title/quote 均为字符串；signals 为对象数组；`ocr.text` 为字符串。
- 扩展字段保留在完整记录中，已知字段不能用错误类型替代。正式分值量纲、阈值和权限由真实服务确认，不因前端默认阈值而视为已经完成模型校准。

报告结构示例（不是检测结果）：

```json
{
  "id": "example-case",
  "filename": "example.wav",
  "created_at": "2026-11-13T00:00:00Z",
  "summary": "接口示例，不是检测结论。",
  "modules": {
    "audio": {"status": "unavailable", "note": "接口结构示例，尚无检测结果"}
  },
  "next_steps": ["通过熟悉的联系方式独立核实。"]
}
```

文件约束：每次单文件，非空且不超过 104857600 字节；声音 wav/mp3/m4a/flac/ogg，视频 mp4/mov/avi/webm，图片与截图 jpg/jpeg/png/webp。已知视频时长超过 180 秒会拒绝；浏览器元数据读取失败时明确提示仍需服务端校验。后端必须验证内容、真实类型和时长，不能只信文件扩展名。

## 可选真实流式输出

后端可在上传回执增加 `events_url` 启用 SSE。前端接收实际增量文本、去重并合并渲染，最终报告仍必须通过完整校验。没有该字段时沿用轮询。断流/协议不支持时恢复同一任务查询，不再次上传。详见 [SSE-CONTRACT.md](SSE-CONTRACT.md)。

当前前端没有新建登录系统、自动 SSE 重连或 Last-Event-ID；刷新恢复采用普通 GET 查询。客户端取消读取也不是后端取消作业。

## 请求与恢复

- 上传不自动重试，防止重复创建任务；提交超时提醒先检查历史。
- 已获得编号的任务会绑定 API 来源保存在会话存储中；恢复只轮询，不重新上传。切换 API 来源后不恢复另一来源的任务。
- 轮询失败三次后保留任务，允许手动恢复；404 清理失效任务。视图切换会取消该视图的读取，上传任务可继续完成。
- 非 JSON、无效任务/报告及嵌套字段、网络异常和超时显示明确错误；选中的材料留在当前页面供重试，不写入本地存储。
- `qinan-contacts` 和动效偏好保留。旧 `qinan-demo-history` 不混入真实核验记录，旧深链接仍标为旧版示例。

请求默认 25 秒超时，POST 上传 60 秒。客户端本身不重试 POST；轮询的正常间隔是请求耗时再加 1.5 秒，最多 800 轮，连续三次请求错误后保留任务。401/403 立即返回权限提示；job 404、明确失败、取消或过期清理对应恢复编号。非成功 HTTP body 不直接展示，按安全状态文案处理；429 尚不解析 Retry-After。

回归包含受控 JSON 响应和本地真实 HTTP SSE 测试服务；尚未与真实模型、登录权限或部署网关联调。部署时验证 CORS/HTTPS、鉴权、上传代理限制、任务持久化、完成后历史可查，以及网关不缓存 job/报告响应。生产模板见 `deployment/nginx.conf.example`。
