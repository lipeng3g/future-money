# Next Task（worker 更新）

## 刚完成
- AI 分析抽屉流式取消与过期写回防护已落地：关闭抽屉、组件卸载或账户范围变化时主动中止流式请求，并用 requestId 屏蔽旧请求结果回灌
- 已补组件级回归测试，覆盖"关闭即中止"与"scope 变化不写回旧结果"两条关键交互
- 已吸收并保留用户在 origin/main 的构建修复（vendor-antd 单一 chunk 消除循环依赖）
- 账户管理 FileReader 失败处理已验证通过

## 当前状态
- 本地分支 `auto/2026-03-09-import-read-error` 领先 origin/main 3 commits，验证全部通过，准备推送

## 下一轮优先级
1. **浏览器级 smoke 自动化**：在现有 store / 组件测试闭环之外，再补预览态真实页面脚本，覆盖文件选择、确认框输入、toast 与撤销入口的真实浏览器接线
2. **字段级数据校验**：继续给导入路径加更细的结构/值校验，例如异常 recurrence 组合、非法 createdAt/updatedAt、空白 note/name 的统一降级策略
3. **浏览器级 smoke 自动化**：在现有 `npm run smoke` 的 store 闭环之上，再补预览态真实页面导入/撤销脚本，覆盖文件选择、确认框与 toast 接线
4. **构建性能余项**：继续审视 `vendor-antd` / `chart-balance-runtime` 告警与 `vendor-date -> vendor-antd` circular chunk，优先找不回退用户修复前提下的安全拆分点
