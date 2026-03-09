
## 刚完成
- 单账户导入现在也会先展示 sanitize 后确认摘要：来源账户、目标账户、事件/对账/账本/覆盖数量、事件规则列表，以及坏字段/断裂引用会被过滤的说明
- 已补 AppHeader 组件级回归，覆盖“确认文案错误会拦截导入”与“确认后仅覆盖当前账户、其他账户保持不变”
- 将 `vite.config.ts.timestamp-*.mjs` 纳入 `.gitignore`，避免本地 preview / 探活验证生成的临时文件污染工作区
- 已再次完整跑通 `npm install`、`npm test`、`npm run type-check`、`npm run build`、`npm run smoke`、`npm run preview + curl -I`

## 当前状态
- 单账户导入确认框已补到 sanitize 后摘要 + 当前账户事件规则 diff
- 已新增 `scripts/browser-import-smoke.mjs` 作为页面级 smoke 草稿；当前仓库尚未安装 `playwright`，因此仍未接入 npm 脚本
- 当前自动化验证闭环以 vitest/store smoke + preview 探活为主，页面级 browser smoke 仍需后续决策补齐

## 下一轮优先级
1. 若接受新增依赖，可补装 `playwright` 并把 `scripts/browser-import-smoke.mjs` 接入自动化脚本；否则继续用 OpenClaw/browser 工具或更轻量方案把页面级 smoke 变成可重复执行的无依赖流程
2. 把 browser smoke 从“单账户导入”继续扩展到“恢复全部账户”，覆盖旧备份预警、账户 diff、按账户数据变化与撤销入口
3. 继续处理构建性能余项：在不回退用户 vendor-antd 修复的前提下，寻找 chart-balance-runtime 的安全拆分点
