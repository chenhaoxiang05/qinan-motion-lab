# 亲安 QINAN v4

## 本次更新

- 黑银液态视觉：弧面金属盾框、烟灰色凸面内芯、真正立体的本地「安」字轮廓，反光来自程序生成的摄影棚环境。
- 背景使用 GPU 液态光带与鼠标流场；悬浮入口的鼠标/键盘焦点会影响场景，体素切换会触发涟漪。
- 盾牌与「先核实／再放心」双行标语之间可逆重组，GPU 实例化最多 4096 个体素，移动端初始 2048 个。
- 收回顺序：内容淡出 90ms → 窗口形变 420ms → 入口文字淡入 120ms。背景遮罩保留到收回完成，漂浮与倾斜动画随后恢复。
- 展开、打开、收回、关闭四态控制器统一管理时间线；连续点击只保留最新目标，重复关闭、Esc、中途暂停和组件销毁均有清理。
- 保留四个悬浮入口、右上角唯一返回按钮、答题编号退场、材料类型原位切换、联系人和记录。无 WebGL 时保留本地 SVG 盾牌与标语切换。

## 运行

```sh
npm ci
npm run dev
npm run check
npm test
npm run build
```

静态产物在 dist/。保留 hash 路由、联系人 qinan-contacts 本地存储及原有 /api 接口。默认交互演示模式，未附带模型后端。Three.js 延迟加载，功能页面先挂载；中文轮廓和字体均在本地，许可见 public/licenses。

## 验证范围

28 个自动化检查通过，包括上传/联系人/报告/答题回归、动画生命周期、真实 Anime.js 基础动画与 createLayout 无布局变化分支、几何法线/索引/字形孔洞、移动端与桌面体素目标及 WebGL 失败降级。语法检查和生产构建通过。

真实 createLayout 检查在 JSDOM 中主动完成时间线；它不具备浏览器的布局与合成能力，不能证明收回时没有视觉闪烁。当前环境浏览器工具无法启动，WebGL 观感、真实弹窗合成和逐帧动效仍未完成浏览器验收。

## 设计与动效参考

- [React Bits / Liquid Chrome](https://www.reactbits.dev/backgrounds/liquid-chrome)：液态金属背景的视觉方向。
- [Codrops / Akaru 2019](https://tympanus.net/codrops/2019/12/30/case-study-akaru-2019/)：通过材质与交互塑造主视觉。
- [Codrops / Phantom Land](https://tympanus.net/codrops/2025/06/30/invisible-forces-the-making-of-phantom-lands-interactive-grid-and-3d-face-particle-system/)：场景、指针与粒子的联动思路。
- [Anime.js / Animate modal dialog](https://animejs.com/documentation/layout/usage/animate-modal-dialog/)：原生 dialog 的共享布局。
- [Anime.js / Exit layout animation](https://animejs.com/documentation/layout/usage/exit-layout-animation/)：答题进度的布局退场。

本项目自行实现背景 shader、盾牌建模与场景交互，没有远程拉取上述网站的素材。
