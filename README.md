# 亲安 QINAN v13 · 对角光场与完整操作反馈

黑、骨白、酸绿与局部钴蓝构成的个人安全界面。四个悬浮入口连接材料核验、家人联系人、情景练习和核验记录；中央完整安印展开外框，呈现「先核实 / 再放心」。

在线版本：[qinan-motion-lab.shadowsky059.chatgpt.site](https://qinan-motion-lab.shadowsky059.chatgpt.site)。沿用原有访问权限，当前开发分支为 `v13-feedback`。旧分支和标签完整保留。

## v13 更新

- 上传材料类型切换会同步过渡说明、格式提示和文件夹细节，保留当前上传面板、焦点与同步文件选择器调用；连续切换以最后一次选择为准。
- 补充文件选择/移除、表单校验、联系人和记录等局部操作反馈。真实提交与读取状态仍来自 API，动画不生成检测结果。
- 背景收敛为左上、右下两个对角大光场，参考 JIEJOE 首屏的相对位置与惯性跟随；移除点阵、刻度和多条细线，保留独立背景与透明安印。
- 四个首页入口使用持续循环 SVG 图标：扫描框、电话与波纹、题卡与对勾、双指针时钟；手机也显示图标。“核实”的完整绿线增加独立短亮段。
- 保留模块序章、四类教程、Gooey 材料标签、真实 API 对接与旧版历史。所有新增动效支持暂停、减少动态效果、页面隐藏和安全销毁。

## 在其他设备继续开发

推荐 Node.js 22.12+ 或 Node.js 24 LTS。

```sh
git clone https://github.com/chenhaoxiang05/qinan-motion-lab.git
cd qinan-motion-lab
git switch v13-feedback
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

自动化检查覆盖材料切换、局部反馈与焦点、循环图标、双角背景、暂停和故障降级，以及原有上传、教程、答题和窗口生命周期。详见 [v13 验收记录](docs/V13-ACCEPTANCE.md)。

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
| 第十三版对角光场与操作反馈 | `v13-feedback` |

查看旧版：`git switch --detach v3.0.0`；从旧版继续：`git switch -c my-redesign v3.0.0`。切换版本后重新执行 `npm ci`。

## 来源与许可

原创 QINAN 代码使用 [MIT](LICENSE)。**Rare UI 组件保留独立的 MIT + Commons Clause + Attribution 条款，不适用本项目的 MIT 再许可。**组件作为此应用的一部分提供，不作为独立组件库分发。来源、固定提交、校验值和修改说明见 [第三方说明](third-party/rare-ui/README.md) 与 [完整许可](third-party/rare-ui/LICENSE)。网站页脚提供可见署名，发布产物也包含许可文本。

- [Rare UI Folder](https://www.rareui.com/components/foldercomponent)、[Inline AI Status](https://www.rareui.com/components/aistatus)、[Grid Reveal](https://www.rareui.com/components/gridreveal)：直接改编的组件源码，Copyright © 2026 Swami Malode。
- [Rare UI Faq](https://www.rareui.com/r/faq.json) 与 [AnimatedCounter](https://www.rareui.com/r/animated-counter.json)：直接改编的复盘与计分组件。
- [Rare UI Gooey Nav](https://www.rareui.com/components/gooeynav)：直接改编的材料选择组件。v12 使用过的 Matrix Orb 原始来源保留在仓库中，v13 不再挂载或导入首页点阵。
- [JIEJOE 首页](https://www.jiejoe.com/home)：参考左上、右下的大光场与惯性跟随的层次关系；不包含其图片、字体或网站源码。
- [Anime.js Exit layout animation](https://animejs.com/documentation/layout/usage/exit-layout-animation)：答题队列退场。
- [Michael Rigley 的 Marathon 设计案例](https://www.michaelrigley.com/work/marathon/)作为配色、图形和信息排布参考；不包含游戏商标、美术或专有字体。QINAN 英文字标为原创路径，中文轮廓来自许可允许的 Noto Sans CJK；动效使用 Anime.js，并非 Rare UI 的 Valorant 组件。
- 本地字体和其他依赖遵循各自许可，字体许可随发布保留在 `public/licenses/`。
