# 亲安 QINAN v14 · 修复后交接包

请先读 `docs/V14-REVIEW.md`，再按 `docs/API-INTEGRATION.md` 联调；可选实时输出协议在 `docs/SSE-CONTRACT.md`。压缩包的准确提交在 `SOURCE.json`，每个文件的校验值在 `MANIFEST.sha256`。

## 包内内容

- `frontend/`：修复后的完整工程、锁文件、类型配置、测试和 `dist/` 构建产物。
- `docs/`：修复记录、接口和 SSE 协议。
- `deployment/nginx.conf.example`：同源 API、上传大小、静态缓存和 SSE 转发示例。
- `verification/`：对应本次提交的安装、类型/语法检查、测试、构建日志及结果。

原有版本保留在 GitHub 分支/标签。本包不含 node_modules、Git 元数据、凭证、本地环境配置、用户材料或模型后端；原项目 Sites 关联配置与代理协作指令也不随包交给后端。

## 启动与检查

需要 Node.js 22.12+，推荐 Node.js 24。进入 `frontend` 后：

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Windows 可手动复制 `.env.example` 为 `.env.local`。默认 `VITE_API_BASE_URL=/api`；开发代理 `QINAN_API_PROXY_TARGET=http://127.0.0.1:8010` **保留 `/api` 前缀**，不会启动后端。先启动已有后端，再联调前端。

```sh
npm run check
npm test
npm run build
```

`check` 包含 strict TypeScript；测试使用 tsx loader，构建由 Vite 完成。默认 `dist/` 连接同源 `/api`。改变 `VITE_API_BASE_URL` 必须重新构建；`VITE_` 变量公开可见，不能填密钥。

## 给后端小组

1. 原有四接口保持兼容：POST analyze、GET job、GET cases、GET case detail。上传 scene 仅 chat/general，context 当前为空。
2. 新增严格字段校验，数字不能以字符串混传；状态、报告结构和阈值请按契约返回。
3. 若提供 SSE，在上传回执里广告受信任的 `events_url`；前端才启用增量输出。否则继续轮询，不会伪造文本。
4. 网络/流异常恢复只查询同任务，不会自动再次上传。取消/过期终态明确结束；客户端退出不是后端作业取消。
5. 生产请使用实际 HTTPS/鉴权/反向代理；开发代理不会进入静态 dist。模板需改路径、上游并执行 nginx -t，不能直接视为已部署。

三个已复现问题和可实施工程缺口的修复证据均见修复记录。真实模型、登录/权限、原生浏览器和设备性能仍需联合验收，未冒充已完成。

请保留 `frontend/LICENSE`、第三方/字体许可及 Rare UI 可见署名。不要把第三方组件改称为项目原创 MIT 代码。
