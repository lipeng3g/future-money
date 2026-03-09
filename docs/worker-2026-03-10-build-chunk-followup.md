# 2026-03-10 build chunk follow-up

## 背景

当前本地构建已经通过延迟挂载把首屏体感做得更轻，但产物层仍有两个明显风险：

1. `chart-balance-runtime` 仍是超大异步块，后续若误把 `echarts` / `vue-echarts` 重新并入 UI vendor，会让首屏与缓存命中都退化。
2. 目前没有自动化守门去检查构建产物分布，容易在后续重构 `manualChunks` 时悄悄回退。

## 本轮动作

- 在 `vite.config.ts` 中显式把 `echarts` / `zrender` / `vue-echarts` 收口到 `vendor-charts`，避免这些图表依赖跟 `ant-design-vue` 混入同一 vendor chunk。
- 把 `dayjs` 从通用 `vendor-date` 调整为跟随 `vendor-antd`，仅保留 `date-fns` 在 `vendor-date`，从而消除生产构建里真实出现的 `vendor-date -> vendor-antd -> vendor-date` circular chunk 警告。
- 新增 `scripts/check-build-chunks.mjs`，在构建后自动检查：
  - 应用入口 `index-*.js` 仍维持轻量；
  - `vendor-charts` 必须存在；
  - `chart-balance-runtime` / `chart-cashflow-runtime` 必须存在；
  - `vendor-charts` 与 `vendor-antd` 不得回退到当前确认过的软阈值之外。
- 新增 `scripts/check-build-log.mjs`，配合保留的 `build.log` 检查构建输出里是否出现 circular chunk 警告，避免只看 `dist/assets` 时漏掉运行时装配风险。

## 预期收益

- 更稳定地维持图表按需加载边界。
- 后续继续打磨本地性能时，有一条可重复执行的构建烟雾守卫，不必每次人工看 `dist/assets`。

## 后续可继续看

- 若还要继续压 `chart-balance-runtime`，优先排查 ECharts 注册项是否还能继续裁剪，而不是回退到把更多业务代码拆成碎片。
- 可以考虑把 `build:check` 纳入 CI，但前提是先确认现有告警阈值和 chunk 命名策略稳定。
