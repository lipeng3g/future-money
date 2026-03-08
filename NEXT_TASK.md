# Next Task（worker 更新）

## 刚完成
- 已为 AI 分析链路补齐本地配置规范化与代理目标双层校验：
  - 保存前自动规范 baseUrl
  - 支持从完整 `/chat/completions` 地址回收为 base URL
  - 拒绝 localhost / 127.* / 10.* / 172.16-31.* / 192.168.* 等内网目标
  - Cloudflare Pages `ai-proxy` 也做了服务端拦截，避免仅靠前端约束
  - 已补回归测试

## 下一轮优先级
1. **继续压包**：`vendor-charts` 仍约 563kB，下一步优先看是否能把 `vue-echarts` / ECharts runtime 再按图表或 renderer 颗粒细拆，或评估用更轻的图表层替换低价值能力
2. **图表体验继续深化**：为余额图补“今日 / 预警 / 最低点”快捷定位与更清晰的数据窗默认范围，减少长时间线手工拖动成本
3. **导入恢复防误操作**：继续打磨 `scope=current|all|legacy-unknown` 的恢复提示，考虑在确认框中增加更显眼的风险分级文案
4. **AI 体验**：继续检查分析抽屉的流式渲染/大段 markdown 性能，必要时做消息虚拟化或渲染节流
