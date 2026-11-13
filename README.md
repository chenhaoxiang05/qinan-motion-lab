# 亲安 QINAN v7 · 聚合与判断

黑白与酸绿的个人安全界面。保留四个悬浮入口、可重组的立体「安」盾牌，以及材料核验、联系人、情景练习和历史记录。

在线版本：[qinan-motion-lab.shadowsky059.chatgpt.site](https://qinan-motion-lab.shadowsky059.chatgpt.site)。使用原有访问权限，开发分支为 `v7-experience`。`main` 和旧版标签继续保留历史版本。

## v7 更新

- 启动页将「亲安」拆成 12 个本地 SVG 部位。界面、交互组件、场景三个真实就绪事件分别推动一组归位，持续显示“正在加载亲安”；首次约 2.4 秒，刷新短版约 0.4 秒，支持跳过与 4 秒超时放行。
- 关闭功能窗口时，模糊和暗色遮罩立即消失，空外壳继续回到入口。原生 dialog 与滚动锁直到回收结束才释放，防止点击穿透或正文闪动。
- 点击内容面板外的空白返回主页；面板内部留白、拖拽、文字选择、文件选择和辅助弹窗不会误触退出。右上角返回和 Esc 继续可用。
- 六道情景题改为“材料＋判断”：短信、视频来电记录、通话摘要和语音转写均明确标为虚构情景。作答后标出关键线索、你的选择及建议做法，再由用户进入下一题。
- 六张带主题的待处理票据通过 Anime.js 官方布局退场方式逐张移除；题目框架和计分节点保持挂载，换题只切换局部内容。
- 直接接入 [Rare UI](https://rareui.com) 的 AnimatedCounter 与 Faq，用于真实分数与错题复盘；保留 Folder 上传、Grid Reveal 图片预览与 Inline AI Status。
- 保留黑白酸绿 FUI、三维「安」盾牌、34% 间隙的体素重组，以及上传、联系人、报告和历史记录功能。

## 在其他设备继续开发

推荐 Node.js 22.12+ 或 Node.js 24 LTS。

```sh
git clone https://github.com/chenhaoxiang05/qinan-motion-lab.git
cd qinan-motion-lab
git switch v7-experience
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

自动化覆盖上传与拖拽、启动就绪/超时、真实 React 组件接入、Anime.js 生命周期、弹窗文字恢复、答题队列、体素间隙和 WebGL 降级。详见 [v7 验收记录](docs/V7-ACCEPTANCE.md)。

当前浏览器工具启动失败，未完成真实浏览器截图、GPU 观感、移动端触控和原生文件选择器、字形聚合和情景练习视觉验收。JSDOM 检查不能替代这些检查。按用户授权继续同步本次版本；不把未执行的视觉验收标为通过。

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

查看旧版：`git switch --detach v3.0.0`；从旧版继续：`git switch -c my-redesign v3.0.0`。切换版本后重新执行 `npm ci`。

## 来源与许可

原创 QINAN 代码使用 [MIT](LICENSE)。**Rare UI 组件保留独立的 MIT + Commons Clause + Attribution 条款，不适用本项目的 MIT 再许可。**组件作为此应用的一部分提供，不作为独立组件库分发。来源、固定提交、校验值和修改说明见 [第三方说明](third-party/rare-ui/README.md) 与 [完整许可](third-party/rare-ui/LICENSE)。网站页脚提供可见署名，发布产物也包含许可文本。

- [Rare UI Folder](https://www.rareui.com/components/foldercomponent)、[Inline AI Status](https://www.rareui.com/components/aistatus)、[Grid Reveal](https://www.rareui.com/components/gridreveal)：直接改编的组件源码，Copyright © 2026 Swami Malode。
- [Rare UI Faq](https://www.rareui.com/r/faq.json) 与 [AnimatedCounter](https://www.rareui.com/r/animated-counter.json)：直接改编的复盘与计分组件。
- [Anime.js Exit layout animation](https://animejs.com/documentation/layout/usage/exit-layout-animation)：答题队列退场。
- Marathon 的界面设计语言仅作为图形与布局方向参考，没有使用其商标、游戏美术或专有字体。
- 本地字体和其他依赖遵循各自许可，字体许可随发布保留在 `public/licenses/`。
