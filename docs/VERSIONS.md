# 版本目录与固定源码

共 15 个归档版本。点击版本查看当时的功能说明、验收记录与限制；Release 页底部的 **Source code (zip / tar.gz)** 可下载完整源码。旧标签未移动，所有归档均标记为预发布，不将历史实现描述为正式稳定版。

|版本|主要变化|源码提交|
|---|---|---|
|[v1.0.0](https://github.com/chenhaoxiang05/qinan-motion-lab/releases/tag/v1.0.0)|初版动效前端与核验、联系人、练习、记录功能|[56c78c5](https://github.com/chenhaoxiang05/qinan-motion-lab/tree/56c78c52974d0f56dc63747cccc63e5ca90d6db3)|
|[v2.0.0](https://github.com/chenhaoxiang05/qinan-motion-lab/releases/tag/v2.0.0)|取消侧边栏，改为四个悬浮入口与持续存在的 3D 主页|[080fb66](https://github.com/chenhaoxiang05/qinan-motion-lab/tree/080fb66a4f20dc118ea2199fccfb9d6e7238f061)|
|[v2.1.0](https://github.com/chenhaoxiang05/qinan-motion-lab/releases/tag/v2.1.0)|加入安字盾牌、体素标语、题卡退出及共享布局|[1b3c203](https://github.com/chenhaoxiang05/qinan-motion-lab/tree/1b3c203b64f5195d587d1446a0920428b935e242)|
|[v3.0.0](https://github.com/chenhaoxiang05/qinan-motion-lab/releases/tag/v3.0.0)|修复窗口关闭后主页入口仍隐藏的问题|[8cf0ada](https://github.com/chenhaoxiang05/qinan-motion-lab/tree/8cf0ada37574bf40828c3add2aaef954cf5b4674)|
|[v4.0.0](https://github.com/chenhaoxiang05/qinan-motion-lab/releases/tag/v4.0.0)|黑银视觉与共享布局过渡修复|[25509f2](https://github.com/chenhaoxiang05/qinan-motion-lab/tree/25509f27f830720498c954ac6a7be05c54d70a35)|
|[v5.0.0-beta.1](https://github.com/chenhaoxiang05/qinan-motion-lab/releases/tag/v5.0.0-beta.1)|修复隐藏文字，调整体素间隙|[2dcc527](https://github.com/chenhaoxiang05/qinan-motion-lab/tree/2dcc527921fd8b897c7dc8ee42ba9247d908b05d)|
|[v6.0.0-beta.1](https://github.com/chenhaoxiang05/qinan-motion-lab/releases/tag/v6.0.0-beta.1)|FUI 启动与 Rare UI 文件夹上传|[6eda523](https://github.com/chenhaoxiang05/qinan-motion-lab/tree/6eda5233cdf8cfe06881876d393fd841408b1173)|
|[v7.0.0-beta.1](https://github.com/chenhaoxiang05/qinan-motion-lab/releases/tag/v7.0.0-beta.1)|聚合启动字形与情景练习重构|[4086c70](https://github.com/chenhaoxiang05/qinan-motion-lab/tree/4086c70a4da2c70c0c5ab704b4a675f3dc25476d)|
|[v8.0.0-beta.1](https://github.com/chenhaoxiang05/qinan-motion-lab/releases/tag/v8.0.0-beta.1)|答题导航常驻与字标动效|[2f4179e](https://github.com/chenhaoxiang05/qinan-motion-lab/tree/2f4179ec8f634ec4c94107a5ac3b6bfd160fb70c)|
|[v9.0.0-beta.1](https://github.com/chenhaoxiang05/qinan-motion-lab/releases/tag/v9.0.0-beta.1)|信号海报、机械安印与真实 API 流程|[5727fee](https://github.com/chenhaoxiang05/qinan-motion-lab/tree/5727fee743fba8130a333d8c745ec6bbe6643700)|
|[v10.0.0-beta.1](https://github.com/chenhaoxiang05/qinan-motion-lab/releases/tag/v10.0.0-beta.1)|分阶段入场、完整安印与持续信号场|[2c36f12](https://github.com/chenhaoxiang05/qinan-motion-lab/tree/2c36f1243e5df23d6ecc69aec382826b46a1e45f)|
|[v11.0.0-beta.1](https://github.com/chenhaoxiang05/qinan-motion-lab/releases/tag/v11.0.0-beta.1)|强化背景动态、内容入场与使用示例|[41b8ed3](https://github.com/chenhaoxiang05/qinan-motion-lab/tree/41b8ed3cf3af1bff42bd331e878c56bc8cb58644)|
|[v12.0.0-beta.1](https://github.com/chenhaoxiang05/qinan-motion-lab/releases/tag/v12.0.0-beta.1)|独立荧光环境背景与 Rare UI 交互|[e2e6e5a](https://github.com/chenhaoxiang05/qinan-motion-lab/tree/e2e6e5a5b32e85ff131df35f28a13477d3e6d677)|
|[v13.0.0-beta.1](https://github.com/chenhaoxiang05/qinan-motion-lab/releases/tag/v13.0.0-beta.1)|对角光场与各模块局部操作反馈|[8b665e0](https://github.com/chenhaoxiang05/qinan-motion-lab/tree/8b665e0fbd253486465791de7af33a370afb52c7)|
|[v14.0.0-beta.1](https://github.com/chenhaoxiang05/qinan-motion-lab/releases/tag/v14.0.0-beta.1)|严格类型、SSE、任务恢复、错误边界与交接修复|[d7d8c17](https://github.com/chenhaoxiang05/qinan-motion-lab/tree/d7d8c1704cb364bcae526d1c5aaf88849619d104)|

## 使用历史版本

```sh
git fetch origin --tags
git switch --detach v3.0.0
npm ci
npm run dev
```

要继续修改旧版，使用 `git switch -c my-redesign v3.0.0`。依赖、命令与 API 行为以选定提交为准；旧版可能仍含演示模式，不能用于真实风险判断。
