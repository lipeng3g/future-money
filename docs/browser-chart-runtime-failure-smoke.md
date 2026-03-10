# Browser smoke: 图表 runtime 下载失败/超时兜底

目的：在真实 `npm run preview` 站点里验证「ECharts runtime 动态 import 失败」时的 UI 兜底文案/按钮行为，确保不是只在单测里模拟通过。

> 适用范围：本项目**本地预览**（不涉及登录/云端/多端同步）。

## 准备

1. 安装依赖并构建：

```bash
npm install
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

2. 打开：<http://127.0.0.1:4173/>

3. 确保首页会出现图表区域（余额图 / 月度图其中之一）。

## Case A：模拟「离线/断网」导致 chunk 下载失败

1. 打开浏览器 DevTools → Network
2. 勾选 **Offline**
3. 刷新页面
4. 观察图表区域：
   - 应显示 “图表引擎加载失败/下载失败” 类提示
   - 有“重试加载”按钮（或等价操作）
   - 文案应提示检查网络后重试
5. 取消 Offline
6. 点击“重试加载”
7. 预期：图表能成功渲染（或至少进入 loading 并最终成功），错误提示消失

## Case B：模拟「资源被拦截/返回 404」的 chunk 失败

> 说明：我们不建议在生产里依赖此步骤；它仅用于本地验证 `ChunkLoadError` 类错误文案。

1. DevTools → Network → 右键勾选 “Block request URL”（Chrome）
2. 刷新页面，找到与 ECharts/runtime 相关的 chunk 请求（通常文件名包含 `chart-`/`echarts`/`runtime`）
3. 将该请求 URL 加入 block
4. 刷新页面
5. 预期：出现「下载失败/加载被中断」类错误提示，并建议刷新页面/稍后重试

## Case C：模拟「加载超时」

1. DevTools → Network throttling 选择 **Slow 3G**（或更慢）
2. 刷新页面
3. 若超过 12s（默认超时）仍未完成：
   - 预期：出现「加载超时」类提示
   - 文案提示刷新/重试

> 若 Slow 3G 仍然不触发超时，可改为更极端的 throttling 或用浏览器扩展/代理人为延迟。

## 记录与回归

- 触发失败后，建议截图/录屏记录 UI 提示与按钮行为
- 该 smoke 的目标是确认：
  - **真实 chunk 失败**时，组件层兜底 UI 能稳定出现
  - “重试加载”行为在网络恢复后能自愈

