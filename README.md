# 亲安 QINAN v5 · Experimental

v5 实验分支：修复文字可见性与动画生命周期，重做分层盾牌、稀疏体素和非对称首页。**真实浏览器视觉验收待完成，线上站点和 main 仍保留 v4。**

## 本次更新

- 窗口通过独立空外壳形变，真实正文不参与布局快照。原生 dialog 保持打开直到收回结束。
- 已作答题目的解析重开时直接显示；窗口及设置/帮助弹窗统一处理关闭、暂停、切后台、失效回调与动画异常。
- 体素按实际字形生成：桌面 2610、移动端 2018 个，单层排列，方块边长为网格间距的 66%，取消重复叠层。
- 1500ms 三段重组：200ms 分解、900ms 迁移、400ms 归位。盾牌采用薄银框、内凹烟灰芯和分离的立体「安」字。
- 大字海报构图、错位悬浮入口、局部折射光带与指针点阵。功能页统一字号、留白和触控区域。
- 盾牌位置跟随页面中的布局锚点，滚动与缩放时保持对齐；WebGL 失败保留本地 SVG 盾牌与标语。

## 运行与检查

推荐 Node.js 22.12+ 或 Node.js 24 LTS。

```sh
npm ci
npm run dev
npm run check
npm test
npm run build
```

构建产物在 dist/。没有新增运行时依赖，Three.js 继续延迟加载。中文轮廓与字体均为本地资源；许可位于 public/licenses。

保留原有 hash 路由、联系人 qinan-contacts 本地存储和 /api 接口。默认交互演示模式，仓库不包含模型后端。

## 验证边界与发布

37 项自动化检查、语法检查和生产构建通过。自动化覆盖业务回归、真实 Anime.js 在 JSDOM 中的生命周期、文字消失复现、异常恢复、体素网格间距与字形覆盖、shader 注入和 SVG 降级。JSDOM 不具备真实浏览器布局与 GPU 合成能力，不能证明视觉闪烁已消失，也不能验证 WebGL 的最终观感或帧率。

本次浏览器连接启动失败，错误为 `the gaas-browser node_repl sandbox cannot be disabled`。因此只推送实验分支，不覆盖现有站点、不创建正式 v5 标签。完成 [浏览器验收](docs/V5-ACCEPTANCE.md) 后再合并 main、标记 v5.0.0，并部署。

## 参考与授权

- [Rare UI / Folder](https://www.rareui.com/components/foldercomponent)：层叠入口的交互参考。
- [Rare UI / Inline AI Status](https://www.rareui.com/components/aistatus)：核验状态的反馈节奏参考。
- [Anime.js](https://animejs.com/)：窗口外壳、局部反馈和答题布局退场。

Rare UI 的组件带有额外署名和再分发条款。本次仅参考交互思路，没有复制组件源码、引入其注册表或增加 React 运行时；本项目自主代码继续使用 MIT 许可证。

## 在其他设备继续开发

推荐 Node.js 22.12+（或 Node.js 24 LTS）。

```sh
git clone https://github.com/chenhaoxiang05/qinan-motion-lab.git
cd qinan-motion-lab
git switch v5-experimental
npm ci
npm run dev
```

旧版完整源码和当时的构建产物保留在 Git 历史及标签：

| 标签 | 版本 |
| --- | --- |
| v1.0.0 | 初版 |
| v2.0.0 | 第二版 |
| v2.1.0 | 第二版后续迭代 |
| v3.0.0 | 第三版盾牌与共享布局 |
| v4.0.0 | 第四版黑银液态视觉 |

查看旧版可运行 `git switch --detach v3.0.0`；从旧版继续修改可运行 `git switch -c my-redesign v3.0.0`。回到最新版用 `git switch main`，切换后重新执行 `npm ci`。

源码使用 MIT 许可证；字体及第三方依赖遵循各自许可证，字体许可随仓库保留在 public/licenses。仓库包含前端与已有 API 对接代码，不包含模型后端或运行时的个人联系人数据。`.openai/hosting.json` 是原 Sites 部署关联，普通本地开发无需修改，部署到自己的 Sites 项目时应替换项目 ID。
