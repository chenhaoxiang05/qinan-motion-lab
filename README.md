# 亲安 QINAN v8 · 字形与节奏

黑白与酸绿的个人安全界面。保留四个悬浮入口、可重组的立体「安」盾牌，以及材料核验、联系人、情景练习和历史记录。

在线版本：[qinan-motion-lab.shadowsky059.chatgpt.site](https://qinan-motion-lab.shadowsky059.chatgpt.site)。使用原有访问权限，开发分支为 `v8-flow`。`main` 和旧版标签继续保留历史版本。

## v8 更新

- 收回功能窗口时显示独立的板块编号、标题和说明，回到首页前先恢复入口文字，避免缩回的空白帧；模糊遮罩仍在关闭时立即消失。
- 情景练习压缩顶部标题与待答队列，保留完整材料和三个选项。桌面左右并排，小屏上下排列；材料和答案字号不低于 14px。
- “下一道情景”移到滚动区外的固定操作栏，答题退场结束后解锁；最后一题进入复盘，完成后可原位再练一轮。反馈与 Rare UI 复盘保留，下一步不再埋在长内容底部。
- 启动页改为持续可辨认的「亲安 / QINAN」字标，以字形变奏、轮廓切换、短暂错位和负形切口表达真实加载进度。中文不再拆开飞散；保留三个真实就绪阶段、跳过、短版重访和超时放行。
- 保留 Anime.js 待答票据布局退场、Rare UI 计分与复盘，以及上传、联系人、报告、历史记录和体素盾牌。

## 在其他设备继续开发

推荐 Node.js 22.12+ 或 Node.js 24 LTS。

```sh
git clone https://github.com/chenhaoxiang05/qinan-motion-lab.git
cd qinan-motion-lab
git switch v8-flow
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

自动化覆盖上传与拖拽、启动就绪/超时、真实 React 组件接入、Anime.js 生命周期、弹窗文字恢复、答题队列、体素间隙和 WebGL 降级。详见 [v8 验收记录](docs/V8-ACCEPTANCE.md)。

当前浏览器工具启动失败，未完成真实浏览器截图、GPU 观感、移动端触控和原生文件选择器、字标变奏和情景练习布局的视觉验收。JSDOM 检查不能替代这些检查。按用户授权继续同步本次版本；不把未执行的视觉验收标为通过。

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

查看旧版：`git switch --detach v3.0.0`；从旧版继续：`git switch -c my-redesign v3.0.0`。切换版本后重新执行 `npm ci`。

## 来源与许可

原创 QINAN 代码使用 [MIT](LICENSE)。**Rare UI 组件保留独立的 MIT + Commons Clause + Attribution 条款，不适用本项目的 MIT 再许可。**组件作为此应用的一部分提供，不作为独立组件库分发。来源、固定提交、校验值和修改说明见 [第三方说明](third-party/rare-ui/README.md) 与 [完整许可](third-party/rare-ui/LICENSE)。网站页脚提供可见署名，发布产物也包含许可文本。

- [Rare UI Folder](https://www.rareui.com/components/foldercomponent)、[Inline AI Status](https://www.rareui.com/components/aistatus)、[Grid Reveal](https://www.rareui.com/components/gridreveal)：直接改编的组件源码，Copyright © 2026 Swami Malode。
- [Rare UI Faq](https://www.rareui.com/r/faq.json) 与 [AnimatedCounter](https://www.rareui.com/r/animated-counter.json)：直接改编的复盘与计分组件。
- [Anime.js Exit layout animation](https://animejs.com/documentation/layout/usage/exit-layout-animation)：答题队列退场。
- [Nicolas Girard 的 Valorant 字标设计](https://nicolas.to/Valorant)与 Marathon 的界面设计语言仅作字形、图形和节奏参考，没有使用其商标、游戏美术或专有字体。QINAN 的 SVG 轮廓为本项目绘制；动效使用已安装的 Anime.js API，并非 Rare UI 的 Valorant 组件。
- 本地字体和其他依赖遵循各自许可，字体许可随发布保留在 `public/licenses/`。
