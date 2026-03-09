
## 刚完成
- 图表 runtime 的异步加载状态已抽成 `src/utils/chart-runtime.ts`，余额图 / 月度图现统一具备“加载中 / 成功 / 失败可重试”的共享状态机与 UI 兜底，不再各自散落处理 chunk 加载生命周期
- 图表组件已改为“挂载后再异步加载 ECharts runtime 注册模块”，避免余额图 / 月度图在组件求值阶段就静态绑住 runtime；同时补齐 BalanceChart 组件测试对这层异步初始化语义的覆盖
- 重新 build 后确认 `BalanceChart` 业务壳体已缩到约 11.8kB，但 `chart-balance-runtime` 仍约 556kB，说明当前构建大块主要是 ECharts runtime 本体，不是余额图自身 option/UI 逻辑
- 单账户导入现在也会先展示 sanitize 后确认摘要：来源账户、目标账户、事件/对账/账本/覆盖数量、事件规则列表，以及坏字段/断裂引用会被过滤的说明
- 已补 AppHeader 组件级回归，覆盖“确认文案错误会拦截导入”与“确认后仅覆盖当前账户、其他账户保持不变”
- 将 `vite.config.ts.timestamp-*.mjs` 纳入 `.gitignore`，避免本地 preview / 探活验证生成的临时文件污染工作区
- 已再次完整跑通 `npm install`、`npm test`、`npm run type-check`、`npm run build`、`npm run smoke`、`npm run preview + curl -I`

## 当前状态
- 单账户导入确认框已补到 sanitize 后摘要 + 当前账户事件规则 diff
- `scripts/browser-import-smoke.mjs` 已改为零依赖测试夹具生成脚本；配合 `docs/browser-import-smoke.md` 中的 OpenClaw/browser 操作手册，可重复执行真实页面级导入/撤销 smoke
- 当前自动化验证闭环以 vitest/store smoke + preview 探活为主；页面级 browser smoke 已有仓库内标准步骤，但仍未纳入 npm 全自动脚本

## 下一轮优先级
1. 把 browser smoke 从“单账户导入”继续扩展到“恢复全部账户”，覆盖旧备份预警、账户 diff、按账户数据变化与撤销入口
2. 评估是否需要把页面级 smoke 进一步收口成可一键执行的本地自动化；若引入新依赖，需先单独评估稳定性与维护成本
3. 继续处理构建性能余项：在不回退用户 vendor-antd 修复的前提下，优先研究 `chart-balance-runtime` 的 runtime 级安全拆分点（如确认 `echarts/components` / renderer / chart type 是否还能进一步按使用路径收口），不要再把精力浪费在继续细拆已经很小的业务壳体上
4. 若继续迭代图表稳定性，下一轮优先补 `ChartArea` 与真实异步图表组件之间的联动 smoke，确认“延迟挂载 + runtime 异步注册 + focus 联动”三层组合在页面级也不回退
