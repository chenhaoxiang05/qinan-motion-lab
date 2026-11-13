# 亲安 QINAN v6 · FUI

黑白与酸绿的个人安全界面。保留四个悬浮入口、可重组的立体「安」盾牌，以及材料核验、联系人、情景练习和历史记录。

在线版本：[qinan-motion-lab.shadowsky059.chatgpt.site](https://qinan-motion-lab.shadowsky059.chatgpt.site)。使用原有访问权限，开发分支为 `v6-fui`。`main` 和旧版标签继续保留历史版本。

## v6 更新

- 背景采用稀疏直线网格、定位刻度和酸绿信号轨迹；移除液态渐变及额外流场渲染。
- 每个标签页首次启动约 2.4 秒，同标签页刷新约 0.4 秒；可以点击跳过或按 Esc，最多等待 4 秒。实际界面与场景就绪后进入，暂停动效或系统减少动态效果会跳过。
- 直接接入 [Rare UI](https://rareui.com) 的 Folder、Grid Reveal 与 Inline AI Status 源码。悬停展开第一阶段；点击时展开第二阶段并同步打开文件选择器；支持键盘、触屏与拖入材料。
- 取消文件选择保留原材料，支持相同文件重新选择、替换、移除与预览回收。一次一份材料、100MB 上限和视频 3 分钟限制继续生效。
- 答题进度队列使用 Anime.js `createLayout` / `update` / `leaveTo`，每次作答移除一个编号并让其余编号补位；解析保留，由用户点击下一题。
- React 仅用于三个独立组件区域。主应用仍使用 Vite、原生 dialog、Anime.js 与 Three.js；组件卸载、异步回调和文字可见性与原控制器协调。

## 在其他设备继续开发

推荐 Node.js 22.12+ 或 Node.js 24 LTS。

```sh
git clone https://github.com/chenhaoxiang05/qinan-motion-lab.git
cd qinan-motion-lab
git switch v6-fui
npm ci
npm run dev
```

```sh
npm run check
npm test
npm run build
```

构建输出在 `dist/`，与源码一起保留。React/Motion 组件和 Three.js 场景分别延迟加载；组件样式仅生成带前缀的 Tailwind utilities，没有全局 preflight。

保留 hash 路由、`qinan-contacts` 浏览器本地存储和原 `/api` 接口。默认是**交互演示**，报告明确标注虚构示例；仓库不包含模型后端，也不包含用户运行时的联系人或上传文件。

## 验证与同步

自动化覆盖上传与拖拽、启动就绪/超时、真实 React 组件接入、Anime.js 生命周期、弹窗文字恢复、答题队列、体素间隙和 WebGL 降级。详见 [v6 验收记录](docs/V6-ACCEPTANCE.md)。

当前浏览器工具启动失败，未完成真实浏览器截图、GPU 观感、移动端触控和原生文件选择器视觉验收。JSDOM 检查不能替代这些检查。按用户授权继续同步本次版本；不把未执行的视觉验收标为通过。

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

查看旧版：`git switch --detach v3.0.0`；从旧版继续：`git switch -c my-redesign v3.0.0`。切换版本后重新执行 `npm ci`。

## 来源与许可

原创 QINAN 代码使用 [MIT](LICENSE)。**Rare UI 组件保留独立的 MIT + Commons Clause + Attribution 条款，不适用本项目的 MIT 再许可。**组件作为此应用的一部分提供，不作为独立组件库分发。来源、固定提交、校验值和修改说明见 [第三方说明](third-party/rare-ui/README.md) 与 [完整许可](third-party/rare-ui/LICENSE)。网站页脚提供可见署名，发布产物也包含许可文本。

- [Rare UI Folder](https://www.rareui.com/components/foldercomponent)、[Inline AI Status](https://www.rareui.com/components/aistatus)、[Grid Reveal](https://www.rareui.com/components/gridreveal)：直接改编的组件源码，Copyright © 2026 Swami Malode。
- [Anime.js Exit layout animation](https://animejs.com/documentation/layout/usage/exit-layout-animation)：答题队列退场。
- Marathon 的界面设计语言仅作为图形与布局方向参考，没有使用其商标、游戏美术或专有字体。
- 本地字体和其他依赖遵循各自许可，字体许可随发布保留在 `public/licenses/`。
