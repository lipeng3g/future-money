# 首页图表页面级 smoke（空态 / 延迟加载）

本项目继续保持**零新增浏览器测试依赖**。首页图表的真实页面验证采用：
- `npm run build`
- `npm run smoke`（会生成本页所需状态夹具）
- `npm run preview -- --host 127.0.0.1 --port 4175 --strictPort`（推荐：端口被占用就直接失败，避免自动跳端口导致文档/脚本引用的地址不一致）
- OpenClaw `browser` 工具

目标是把首页图表当前最脆弱的两条真实组合路径固定下来：
1. **空库/无图表数据**：应直接显示真实空态，不应先闪 deferred skeleton
2. **有时间线/有月度数据**：应先显示 deferred skeleton，再在进入视口或 fallback 后加载图表

## 准备

在仓库根目录执行：

```bash
npm run build
npm run smoke
npm run preview -- --host 127.0.0.1 --port 4175 --strictPort
```

其中 `npm run smoke` 会额外生成：

- `tmp-browser-chart-smoke/empty-state.json`
- `tmp-browser-chart-smoke/seeded-state.json`

## 真实浏览器验证步骤

### 场景 A：空库直接显示真实空态

1. 打开 `http://127.0.0.1:4175/`
2. 在页面执行：

```js
localStorage.setItem('futureMoney.onboarding.v3', '1')
```

3. 再执行：

```js
const empty = await fetch('/tmp-browser-chart-smoke/empty-state.json').then((r) => r.json())
localStorage.setItem('futureMoney.state', JSON.stringify(empty))
location.reload()
```

4. 断言：
   - 页面**不包含** `正在按需加载余额图`
   - 页面**不包含** `滚动到这里时再加载月度图表`
   - 页面能直接看到图表组件自己的空态文案（以实际页面渲染为准）

### 场景 B：有数据时先延迟骨架，再加载图表

1. 在页面执行：

```js
const seeded = await fetch('/tmp-browser-chart-smoke/seeded-state.json').then((r) => r.json())
localStorage.setItem('futureMoney.state', JSON.stringify(seeded))
location.reload()
```

2. 首屏加载完成后，先断言页面包含：
   - `正在按需加载余额图`
   - `滚动到这里时再加载月度图表`

3. 滚动到首页图表区域，等待几秒，断言上述两段骨架文案会逐步消失，并出现真实图表区域
4. 可额外检查“预测范围”仍可切换，证明 skeleton → runtime → 图表容器接线仍正常

## 说明

- 这份 smoke 主要覆盖**真实预览站点上的异步边界组合**，不是为了替代组件测试。
- 自动化主验证仍以 `npm test`、`npm run type-check`、`npm run build`、`npm run smoke` 为准。
- 之所以继续不用 Playwright，是因为本仓库当前优先保持零新增依赖、低维护成本；后续若要引入页面自动化框架，需要单独评估稳定性与收益。

## 场景 C：模拟 runtime chunk 失败时的真实兜底 CTA

> 目的：验证「网络异常 / 下载失败」时图表区域的错误提示与重试按钮，在真实预览站点也能出现。
> 这条 smoke 不依赖真实断网/改 host，也不引入 Playwright。

1. 打开 `http://127.0.0.1:4175/`
2. 在页面执行：

```js
localStorage.setItem('futureMoney.debug.chartRuntimeFail.v1', '1')
```

3. 再按 “场景 B” 写入 `seeded-state.json` 并刷新
4. 滚动到图表区域，断言：
   - deferred skeleton 会消失
   - 图表区域出现「下载失败/离线」类的提示文案（以实际 UI 为准）
   - 页面提供重试按钮；点击后仍保持失败（因为 debug 强制失败标记仍在）

5. 清理标记后再验证恢复：

```js
localStorage.removeItem('futureMoney.debug.chartRuntimeFail.v1')
location.reload()
```

