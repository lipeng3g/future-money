- [ ] 继续压缩大体积前端 chunk（当前 build 仍提示 chart-balance-runtime / vendor-antd 超 500 kB），优先从图表 runtime 与 Ant Design 组件级拆分入手。

## 刚完成
- `npm run smoke` 已从“单账户导入 → 撤销”扩到同时覆盖“恢复全部账户 → 确认摘要 → 真恢复 → 撤销回滚”的 UI 闭环；`src/layouts/__tests__/AppHeaderImportUndo.smoke.test.ts` 现在会验证 sanitize 后摘要、账户/事件差异提示、整库恢复真实落地与回滚复原，降低高风险本地恢复链路继续只靠普通组件测试兜底的风险
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
- `npm run smoke` 已纳入两条自动化烟雾：store 级整库恢复/撤销，以及 AppHeader UI 级“导入当前账户 → 确认 → 撤销”闭环；当前高风险本地导入链路已不再只靠手册验证

## 下一轮优先级
1. 评估是否要把 `docs/browser-import-smoke.md` 的真实页面流程进一步半自动化；若引入新依赖，需先单独评估稳定性与维护成本
2. 继续处理构建性能余项：在不回退用户 vendor-antd 修复的前提下，优先研究 `chart-balance-runtime` 的 runtime 级安全拆分点（如确认 `echarts/components` / renderer / chart type 是否还能进一步按使用路径收口），不要再把精力浪费在继续细拆已经很小的业务壳体上
3. 在图表容器层继续补页面级/运行时 smoke，重点确认“IntersectionObserver 延迟挂载 + 超时兜底揭示 + runtime 异步注册 + focus 联动”四层组合在真实预览站点也不会卡成永久骨架
4. 若后续继续打磨导入链路，可把 `sanitize 过滤统计` 再细化到“重复 ID / 非法枚举 / 断裂引用 / 空白字段”分组级原因，而不只是当前的大类说明
5. 继续补 AI 抽屉高风险接线回归，优先覆盖“发送按钮 / 预设入口 / scope 切换 / 导出 / 清空 / 配置缺失门禁”在真实 AntD 控件语义下的组合行为，避免后续 UI 重构把本地分析入口悄悄弄坏
6. 继续检查事件管理链路里是否还存在“成功只改视觉、不做显式反馈”的交互空洞；若继续打磨，可优先看删除以外的批量操作、示例载入与未来可能补充的复制/暂停全部等入口是否需要统一反馈语义
