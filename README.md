# 亲安 QINAN v12 · 荧光环境与点阵交互

黑、骨白、酸绿与局部钴蓝构成的个人安全界面。四个悬浮入口连接材料核验、家人联系人、情景练习和核验记录；中央完整安印展开外框，呈现「先核实 / 再放心」。

在线版本：[qinan-motion-lab.shadowsky059.chatgpt.site](https://qinan-motion-lab.shadowsky059.chatgpt.site)。沿用原有访问权限，当前开发分支为 `v12-ambient`。旧分支和标签完整保留。

## v12 更新

- 背景独立于安印渲染，使用两个大面积黄绿光场、五条跨屏流线与局部钴蓝刻度；无需移动鼠标也会持续运动，悬停卡片不再停止线路。
- Three.js 改为透明画布，只渲染完整安印。模块下载、GPU 初始化或渲染失败会降级为 SVG 安印，不会用黑色画布挡住背景。
- 真实接入 Rare UI Matrix Orb 点阵场与 Gooey Nav 材料选择动画，保留原生按钮、键盘操作和上传流程。无新增依赖，组件来源与许可完整保留。
- 背景支持缓动鼠标跟随、手机构图、暂停与减少动态效果；暂停后仍有彩色静态层次，按钮明确显示“恢复动效”。
- 保留 v11 的模块内容序章、四类使用示例、分段绿色强调线，以及真实 API 对接、联系人和答题功能。

## 在其他设备继续开发

推荐 Node.js 22.12+ 或 Node.js 24 LTS。

```sh
git clone https://github.com/chenhaoxiang05/qinan-motion-lab.git
cd qinan-motion-lab
git switch v12-ambient
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

自动化检查覆盖独立背景与透明安印、暂停和故障降级、Rare UI 点阵与材料选择，以及原有上传、教程、答题和窗口生命周期。详见 [v12 验收记录](docs/V12-ACCEPTANCE.md)。

浏览器工具仍因环境初始化错误无法启动，真实浏览器布局、GPU 观感、移动触控和原生文件选择器尚未验收。静态图形检查和 JSDOM 回归不能代替这些检查；旧版本的独立着色器像素变化也不等同于完整页面的可见动效。

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
| 第十二版荧光环境与点阵交互 | `v12-ambient` |

查看旧版：`git switch --detach v3.0.0`；从旧版继续：`git switch -c my-redesign v3.0.0`。切换版本后重新执行 `npm ci`。

## 来源与许可

原创 QINAN 代码使用 [MIT](LICENSE)。**Rare UI 组件保留独立的 MIT + Commons Clause + Attribution 条款，不适用本项目的 MIT 再许可。**组件作为此应用的一部分提供，不作为独立组件库分发。来源、固定提交、校验值和修改说明见 [第三方说明](third-party/rare-ui/README.md) 与 [完整许可](third-party/rare-ui/LICENSE)。网站页脚提供可见署名，发布产物也包含许可文本。

- [Rare UI Folder](https://www.rareui.com/components/foldercomponent)、[Inline AI Status](https://www.rareui.com/components/aistatus)、[Grid Reveal](https://www.rareui.com/components/gridreveal)：直接改编的组件源码，Copyright © 2026 Swami Malode。
- [Rare UI Faq](https://www.rareui.com/r/faq.json) 与 [AnimatedCounter](https://www.rareui.com/r/animated-counter.json)：直接改编的复盘与计分组件。
- [Rare UI Matrix Orb](https://www.rareui.com/components/matrixorb) 与 [Gooey Nav](https://www.rareui.com/components/gooeynav)：直接改编的点阵场与材料选择组件。
- [JIEJOE 首页](https://www.jiejoe.com/home)：参考大面积光场、跨屏动线与鼠标跟随的层次关系；不包含其图片、字体或网站源码。
- [Anime.js Exit layout animation](https://animejs.com/documentation/layout/usage/exit-layout-animation)：答题队列退场。
- [Michael Rigley 的 Marathon 设计案例](https://www.michaelrigley.com/work/marathon/)作为配色、图形和信息排布参考；不包含游戏商标、美术或专有字体。QINAN 英文字标为原创路径，中文轮廓来自许可允许的 Noto Sans CJK；动效使用 Anime.js，并非 Rare UI 的 Valorant 组件。
- 本地字体和其他依赖遵循各自许可，字体许可随发布保留在 `public/licenses/`。
