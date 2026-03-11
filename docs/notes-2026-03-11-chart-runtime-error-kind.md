# Chart runtime error kind（offline/timeout/chunk/unknown）

背景：余额图、月度收支图现在都采用异步加载 ECharts runtime 的方式，首开更快，但也会引入 chunk 加载失败的可能。

本次新增了 `ChartRuntimeErrorKind` 与 `errorKind` 字段，用于让组件与测试能区分错误类型：

- `offline`：浏览器明确离线（`navigator.onLine === false`）
- `timeout`：加载超时（内部超时码 `FM_CHART_RUNTIME_TIMEOUT` 或通用 timeout 文案）
- `chunk`：动态 import chunk 失败（`ChunkLoadError` / `loading chunk` / `failed to fetch dynamically imported module` 等）
- `unknown`：其他未知错误

收益：
- UI/埋点/测试可稳定区分不同类别的失败（例如离线 vs 超时 vs chunk 断链），避免只靠“字符串包含”导致回归脆弱。
- 后续如果要在错误提示里加上更明确的 CTA（比如离线提示“检查网络”、chunk 提示“刷新页面”）可直接基于 kind 做分支。

相关实现：
- `src/utils/chart-runtime.ts`：新增 `getChartRuntimeErrorKind` + `errorKind` state
- `docs/browser-chart-runtime-failure-smoke.md`：仍可通过 localStorage 标记强制失败，验证真实页面兜底 UI。
