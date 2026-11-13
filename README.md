# 亲安 QINAN v11 · 内容序章与清晰动效

黑、骨白、酸绿与局部钴蓝构成的个人安全界面。四个悬浮入口连接材料核验、家人联系人、情景练习和核验记录；中央完整安印展开外框，呈现「先核实 / 再放心」。

在线版本：[qinan-motion-lab.shadowsky059.chatgpt.site](https://qinan-motion-lab.shadowsky059.chatgpt.site)。沿用原有访问权限，当前开发分支为 `v11-flow`。旧分支和标签完整保留。

## v11 更新

- 背景改为更可见的大范围局部扫描、加长信号包、6 秒网格位移和钴蓝校准标；手机与无 WebGL 降级环境也有明显运动，暂停与减少动态效果仍生效。
- 四个功能窗口和报告增加短暂的内容序章：先显示模块标识与动态图形，再展开实际内容。可立即进入；切换上传类型和回答下一题不会重复整个序章。
- “第一次来？了解使用方法”恢复为可操作教程：声音、视频、照片、聊天截图四组本地示例，依次查看材料、具体线索和独立核实建议。示例不提交接口，也不写入真实核验记录。
- 恢复“核实”下面的绿色强调线，调整为贴字的双段校准线，配合短暂绘制与扫光；改善按钮、入口与表单的细节反馈。
- 扩展现有 Rare UI 组件的使用：模块序章的状态、教程步骤计数与问题展开。保留完整安印、本地字体、真实 API 流程和原有上传、答题、联系人功能。

## 在其他设备继续开发

推荐 Node.js 22.12+ 或 Node.js 24 LTS。

```sh
git clone https://github.com/chenhaoxiang05/qinan-motion-lab.git
cd qinan-motion-lab
git switch v11-flow
npm ci
npm run dev
```

```sh
npm run check
npm test
npm run build
```

构建输出在 `dist/`，与源码一起保留。React/Motion 组件和 Three.js 场景分别延迟加载；组件样式仅生成带前缀的 Tailwind utilities，没有全局 preflight。

保留 hash 路由和 `qinan-contacts` 浏览器本地存储。默认请求同源 `/api`；开发时 Vite 转发至 `http://127.0.0.1:8010`。复制 `.env.example` 为 `.env.local` 可修改代理或公开 API 地址，详见 [后端接入](docs/API-INTEGRATION.md)。

仓库包含前端，不包含检测模型后端。当前 GPT Site 尚未连接核验服务，上传提交和历史读取会显示真实请求错误；不会生成模拟报告。联系人、情景练习和视觉交互可独立使用。

## 验证与同步

自动化检查覆盖模块序章、教程示例隔离、字体与启动、背景时间帧、完整安印，以及上传、接口恢复、答题、联系人与窗口生命周期。详见 [v11 验收记录](docs/V11-ACCEPTANCE.md)。

浏览器工具仍因环境初始化错误无法启动，真实浏览器布局、GPU 观感、移动触控和原生文件选择器尚未验收。原生着色器帧、字体/SVG 栅格图和 JSDOM 回归不能代替这些检查。

每次完成更新都同步 GitHub 和同一个 GPT Site，保持站点原有访问权限；协作约定见 [AGENTS.md](AGENTS.md)。部署关联保存在 `.openai/hosting.json`。普通本地开发无需修改，部署自己的 Sites 项目时需替换项目 ID。

## 历史版本

| 版本 | Git 入口 |
| --- | --- |
| 初版 | `v1.0.0` |
| 第二版 | `v2.0.0` / `v2.1.0` |
| 第三版盾牌与共享布局 | `v3.0.0` |
| 第四版黑银视觉 | `v4.0.0` |
| 第五版文字与体素修复 | `v5-experimental` |
| 第六版 FUI 与 Rare UI | `v6-fui` |
| 第七版聚合启动与情景练习 | `v7-experience` |
| 第八版字标与答题布局 | `v8-flow` |
| 第九版信号海报与机械安印 | `v9-signal` |
| 第十版完整安印与动态信号场 | `v10-motion` |
| 第十一版内容序章与使用示例 | `v11-flow` |

查看旧版：`git switch --detach v3.0.0`；从旧版继续：`git switch -c my-redesign v3.0.0`。切换版本后重新执行 `npm ci`。

## 来源与许可

原创 QINAN 代码使用 [MIT](LICENSE)。**Rare UI 组件保留独立的 MIT + Commons Clause + Attribution 条款，不适用本项目的 MIT 再许可。**组件作为此应用的一部分提供，不作为独立组件库分发。来源、固定提交、校验值和修改说明见 [第三方说明](third-party/rare-ui/README.md) 与 [完整许可](third-party/rare-ui/LICENSE)。网站页脚提供可见署名，发布产物也包含许可文本。

- [Rare UI Folder](https://www.rareui.com/components/foldercomponent)、[Inline AI Status](https://www.rareui.com/components/aistatus)、[Grid Reveal](https://www.rareui.com/components/gridreveal)：直接改编的组件源码，Copyright © 2026 Swami Malode。
- [Rare UI Faq](https://www.rareui.com/r/faq.json) 与 [AnimatedCounter](https://www.rareui.com/r/animated-counter.json)：直接改编的复盘与计分组件。
- [Anime.js Exit layout animation](https://animejs.com/documentation/layout/usage/exit-layout-animation)：答题队列退场。
- [Michael Rigley 的 Marathon 设计案例](https://www.michaelrigley.com/work/marathon/)作为配色、图形和信息排布参考；不包含游戏商标、美术或专有字体。QINAN 英文字标为原创路径，中文轮廓来自许可允许的 Noto Sans CJK；动效使用 Anime.js，并非 Rare UI 的 Valorant 组件。
- 本地字体和其他依赖遵循各自许可，字体许可随发布保留在 `public/licenses/`。
