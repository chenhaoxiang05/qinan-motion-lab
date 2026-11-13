# 亲安 QINAN v3

## 本次更新

- 题卡上方六个编号方块，答完后用 Anime.js createLayout / leaveTo 退场并补位，解析保留。
- 四个悬浮入口与功能窗口通过 data-layout-id 共享布局展开、收回。
- 功能窗口统一只保留右上角返回主页按钮。
- 带本地“安”字轮廓的立体盾牌；点击后立方体重组为“先核实／再放心”，再次点击复原。
- 中文轮廓从本机 Noto CJK 字体生成，不依赖运行设备是否安装中文字体；许可见 public/licenses。
- 变形期间禁止重复触发，打开功能或暂停时收束到目标形态。无 WebGL 时使用静态盾牌/文字替代。

## 运行

```sh
npm ci
npm run dev
npm run check
npm test
npm run build
```

静态产物在 dist/。保留 hash 路由、联系人 qinan-contacts 本地存储及原有 /api 接口。默认交互演示模式，未附带模型后端。

## 验证限制

DOM 回归和真实 Anime.js 基础动画检查通过。布局测量与 WebGL 的实际视觉效果仍需浏览器验收；当前浏览器工具启动失败，不能用 DOM 测试替代视觉验收。
