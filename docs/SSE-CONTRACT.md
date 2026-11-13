# 可选 SSE 实时核验协议（v14）

这是已经实现的前端消费协议，供后端对接；不是宣称当前线上模型已支持流式输出。下面所有编号和文本均为测试结构示例，不是检测结果。不返回 `events_url` 时继续原来的 GET 轮询，无需后端立即改造。

## 启用

`POST /api/analyze` 的现有 multipart 字段不变：`file`、`scene=chat|general`、`context=""`。成功返回 JSON：

```json
{"job_id":"example-job","events_url":"/api/jobs/example-job/events"}
```

流地址须属于已配置 API 的相同 origin 和根路径；不允许把浏览器引向外部或其他路径。前端用 GET fetch、`Accept: text/event-stream`、默认同源凭证读取；拒绝重定向。不要在地址或前端配置中放密钥。跨域登录、Token 获取等仍由双方另行接入现有鉴权。

服务响应 `Content-Type: text/event-stream; charset=utf-8`，不缓存、不聚合缓冲。Nginx 示例已关闭 API 响应缓冲和 gzip。连接空闲超时为 25 秒，建议每 10–15 秒发送注释心跳；单次流最长 20 分钟。

## 事件格式

每帧以空行结束，支持 LF/CRLF、分块 UTF-8 和多行 data。每个增量事件必须有本连接内唯一且非空的 `id`；重复 ID 被忽略。编号最长 256 字符，最多保留 10,000 个 ID。不要给多个不同事件重复使用同一 ID。

```text
: heartbeat

event: status
id: status-1
data: {"status":"processing","message":"正在核验材料"}

event: delta
id: delta-1
data: {"text":"接口测试：正在接收的内容。"}

event: completed
id: completed-1
data: {"result":{"id":"example-case","summary":"接口测试，不是检测结论。","modules":{},"next_steps":[]}}

```

| event | data | 行为 |
| --- | --- | --- |
| `status` / `message` | 与 GET job 相同的对象，含 `status` 与可选 `message` | 更新状态，或按 job 终态结束 |
| `delta` | `{ "text": "增量字符串" }`，要求本帧有唯一 `id` | 逐段追加，页面以约 32ms 合并更新；只使用 textContent，不解析 HTML |
| `completed` | `{ "result": Report }` | 校验完整报告后才进入结果页 |
| `failed` / `cancelled` / `expired` | JSON 对象，例如 `{}` | 结束任务并显示明确终态，清除恢复编号 |
| `ping` / `heartbeat` 或 `: comment` | 可为空 | 保持连接，不呈现为检测内容 |

增量文本只是处理中内容，不能作为最终报告或安全结论。最终报告以校验通过的 `completed.result` 为准。解析器限制约 1MiB 解码帧长度、累计 256Ki 字符增量；页面保留最近 200,000 个字符以约束内存。

## 中断、恢复与错误

- 未广告 `events_url`：直接轮询 `GET /api/jobs/{id}`。
- 流不支持、类型不符、网络中断、EOF 未完成、解析/尺寸失败：恢复查询**同一个任务**，不会再次 POST 文件；已接收文本保留为处理中内容。
- 401/403：退出并提示鉴权问题，保留恢复编号；不会无条件继续请求。
- 明确 failed/cancelled/expired：退出，不将失败伪装成普通处理中。
- 刷新后恢复使用已保存的 job ID 进行普通轮询。当前没有 SSE 重连/Last-Event-ID 协议；不要依赖浏览器 EventSource 自动重连。
- 页面切换保留后台任务；应用销毁中止客户端连接与读取。客户端中止不等于服务端取消，未新增取消作业接口。

轮询仍以请求耗时加 1.5 秒的节奏串行执行，连续三次请求失败后保留编号供手动恢复。服务应继续提供原有 GET job 与历史接口，完成时使报告可持久查询。

实现位于 `src/api-client.ts`、`src/contracts.ts`、`src/task-service.ts`、`src/app.ts`。测试包含 native fetch 连接本地 node:http SSE fixture，验证增量先于完成到达；它验证的是传输协议，不是真实模型联调。
