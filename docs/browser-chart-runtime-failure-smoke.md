# 首页图表：runtime chunk 失败 smoke（真实页面）

目的：验证图表 runtime（ECharts）异步加载失败时，页面能展示明确的错误兜底与重试 CTA。

本仓库继续坚持**零新增浏览器测试依赖**，因此这里的验证方式是：
- `npm run build`
- `npm run smoke`（生成本页所需 localStorage 标记说明文件）
- `npm run preview`（真实预览站点）
- 手动浏览器步骤（或 OpenClaw browser 工具）

## 准备

```bash
npm run build
npm run smoke
npm run preview -- --host 127.0.0.1 --port 4300 --strictPort
```

其中 `npm run smoke` 会生成：

- `tmp-browser-chart-smoke/runtime-failure-flag.json`

里面包含：
- localStorage key：`futureMoney.debug.chartRuntimeFail.v1`
- localStorage value：`1`

## 真实浏览器验证步骤

1. 打开 `http://127.0.0.1:4300/`
2. 在 Console 执行（开启强制失败标记）：

```js
localStorage.setItem('futureMoney.debug.chartRuntimeFail.v1', '1')
```

3. 写入一份**有图表数据**的状态（从 `browser-chart-smoke` 生成的 seeded 夹具读取）：

```js
const seeded = await fetch('/tmp-browser-chart-smoke/seeded-state.json').then((r) => r.json())
localStorage.setItem('futureMoney.state', JSON.stringify(seeded))
location.reload()
```

4. 滚动到首页图表区域，断言：
   - deferred skeleton 会消失
   - 图表区域出现「下载失败/离线」类提示文案（以实际 UI 为准）
   - 页面提供重试按钮

5. 点击重试：由于失败标记仍在，预期仍失败（用于验证重试按钮确实触发重新加载流程）。

6. 清理失败标记后验证可恢复：

```js
localStorage.removeItem('futureMoney.debug.chartRuntimeFail.v1')
location.reload()
```

## 注意

- 该 smoke 目标是验证：组件的 error UI 与真实 chunk 加载失败场景一致。
- 不依赖断网、也不需要改 hosts 或服务端。
