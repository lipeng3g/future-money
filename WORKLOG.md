# future-money 工作日志（非权威草稿）

> 说明：本文件由前台接口层早先写入，不代表自治 worker 的真实工作日志，不应作为后续开发权威依据。自治 worker 可忽略、重写或删除。

[2026-03-14 20:13:22] task: tighten AI empty_stream recovery UX and regression coverage for financial analysis drawer
[2026-03-14 20:13:22] deliverables: AiAnalysisModal now surfaces successful first-packet recovery via explicit retry/downgrade toast without duplicating output; added component regression for empty_stream -> auto retry -> success; revalidated retries-exhausted recoverable banner and diagnostics copy path; quick diff check found no new code change needed for event-card “查看图上日期” layout in current tree
[2026-03-14 20:13:22] verification: npm test ✅ (263), npm run type-check ✅, npm run build ✅
[2026-03-14 21:10:02] task: re-validate P0 empty_stream auto-retry/downgrade diagnostics flow, clear-chat refresh regression, and event-card date-focus overflow in current origin/main
[2026-03-14 21:10:02] deliverables: confirmed current HEAD already contains auto retry (300ms/800ms), one-shot model fallback to gpt-5.2 with UI warning, copyable diagnostics (provider/model/traceId/httpStatus/retries), duplicate-output suppression, regression coverage for retry-success and retries-exhausted banner; also confirmed clear-chat persistence regression tests and EventCard overflow fix remain present
[2026-03-14 21:10:02] verification: npm test ✅ (263), npm run type-check ✅

## 2026-03-08
- 建立长期工作器方案：不再把 isolated cron 误当成持续开发本体，改为 `tmux` 长期工作器 + 文件化上下文 + 每小时汇报。
- 已完成的近期代码成果（进入长期工作器前）包括：
  - 存储仓储接口抽象与迁移测试
  - AI 模块懒加载与代理校验收口
  - 输入校验边界补强
  - Vite manualChunks 初步拆包
- 第一轮长期 worker 实际开发已开始并完成一项真实改动：新增 `src/utils/recurrence.ts`，把时间线生成与对账待确认条目生成中重复的事件发生规则抽成共享模块，避免两套实现继续漂移；同时补上季度/半年/年闰日/endDate 边界测试。
- 当前验证结果：`npm test`、`npm run type-check`、`npm run build` 全通过；仍存在既有的大 vendor chunk 告警，后续继续处理。
[2026-03-08 20:30:23] worker start: inspect repo and choose next task
[2026-03-08 20:30:59] task: inspect tests and add next high-value coverage
[2026-03-08 20:34:17] validating current recurrence refactor
[2026-03-08 20:48:17] task: fix storage normalization so legacy/empty imports do not fabricate default snapshots or reconciliations
[2026-03-08 20:48:17] verification: npm test ✅ (34), npm run type-check ✅, npm run build ✅
[2026-03-08 21:32:00] task: scope AI chat history by selected account set, avoid cross-account context contamination in analysis drawer
[2026-03-08 21:32:00] deliverables: scoped localStorage keys + legacy fallback + scoped export filename + regression tests
[2026-03-08 21:40:00] task: fix AI analysis context source so drawer follows selected account scope instead of accidentally reusing current store timeline/analytics
[2026-03-08 21:40:00] deliverables: extracted buildScopedFinancialContext + scoped timeline/analytics recomputation + regression tests for single/multi/missing reconciliation cases
[2026-03-08 21:47:00] task: reduce initial bundle cost by replacing global Ant Design Vue install with explicit per-component registration in src/main.ts
[2026-03-08 21:47:00] verification: npm run type-check ✅, npm test ✅ (42), npm run build ✅; vendor-antd chunk ~1403kB -> ~718kB, build time ~16.5s -> ~14.3s
[2026-03-08 21:55:00] task: defer ECharts runtime out of app entry; move vue-echarts registration into chart components and lazy-load chart panes from ChartArea
[2026-03-08 21:55:00] expected gain: reduce non-chart route/bootstrap JS, keep analytics cards/upcoming list interactive while chart chunk loads separately
[2026-03-08 21:57:00] verification: npm run type-check ✅, npm test ✅ (42), npm run build ✅; app entry index js 96.67kB -> 88.34kB, chart panes split into BalanceChart/CashFlowChart async chunks; vendor-charts still ~563kB and remains next splitting target
[2026-03-08 21:58:00] task: lazy-load low-frequency management surfaces from header/drawer instead of eagerly shipping them in the app shell
[2026-03-08 21:58:00] deliverables: AppHeader management modals async + render-on-open, MainLayout event panel/form async + render-on-open, ChartArea reconcile modal async to avoid static-import chunk pinning
[2026-03-08 22:00:00] verification: npm run type-check ✅, npm test ✅ (42), npm run build ✅; app entry index js 65.37kB -> 57.04kB, reconciliation/event/account modal code now emitted as separate async chunks
[2026-03-08 22:08:00] task: upgrade import/export from single-account semantics to explicit current-account vs all-accounts backup/restore, avoiding multi-account data loss during local backup workflows
[2026-03-08 22:08:00] deliverables: store-level full backup/restore path, account management dual import/export actions, account-specific export filename, regression tests covering current/all modes
[2026-03-08 22:22:00] task: harden local AI config + proxy target validation to reduce SSRF/internal-target risk and normalize OpenAI-compatible endpoints
[2026-03-08 22:22:00] deliverables: shared target guard in src/utils/ai.ts, config sanitization/normalization, AiConfigModal UX copy update, Cloudflare ai-proxy server-side allowlist check, regression tests for localhost/private-network rejection and URL normalization
[2026-03-08 22:24:00] verification: npm test ✅ (49), npm run type-check ✅, npm run build ✅; build warning unchanged: vendor-charts ~563kB, vendor-antd ~718kB
[2026-03-08 22:34:00] task: harden full-backup restore UX with import preview + typed confirmation before replacing all local accounts/data
[2026-03-08 22:34:00] deliverables: import-preview parser utility, restore-all modal summary (accounts/events/reconciliations/ledger/timestamp), warning styling, Cloudflare ai-proxy function-level tests
[2026-03-08 22:35:00] verification: npm test ✅ (57), npm run type-check ✅, npm run build ✅; build warning unchanged: vendor-charts ~563kB, vendor-antd ~718kB
[2026-03-08 22:46:00] task: reduce AI analysis drawer markdown re-render cost during streaming output
[2026-03-08 22:46:00] deliverables: extracted markdown cache/streaming renderer utility, avoid repeated full markdown-it render for unchanged history, throttle streaming markdown flush on tiny token chunks, added renderer unit tests
[2026-03-08 22:45:00] verification: npm test ✅ (62), npm run type-check ✅, npm run build ✅; AI 抽屉渲染优化已落地，打包体积基本不变，后续继续看 vendor-charts 拆分与 AI 长消息虚拟化
[2026-03-08 22:55:00] task: 提取多账户时间线聚合器，消除 finance store / AI 上下文重复实现，并把按日期 repeatedly find 的 O(accounts×dates×timeline) 聚合改成预索引查表
[2026-03-08 22:55:00] deliverables: 新增 src/utils/timeline-aggregate.ts 共享聚合工具；store 与 AI buildScopedFinancialContext 统一复用；补 timeline-aggregate 单测覆盖余额/事件/accountId/空时间线/日期排序
[2026-03-08 22:55:00] verification: npm run type-check ✅, npm test ✅ (65), npm run build ✅; 功能行为不变，减少多账户视图与 AI 分析上下文构建时的重复扫描成本
[2026-03-08 23:20:00] task: 优化本地持久化写入策略，避免高频编辑/导入时反复全量序列化并写 localStorage，同时保证关键导入/恢复场景可立即读到最新状态
[2026-03-08 23:20:00] deliverables: LocalStorageStateRepository 新增“首写立即落盘 + 短窗口去抖合并 + 相同状态跳过重复写入 + beforeunload/pagehide flush + 显式 flushPendingSave 接口”；store 在 import current / import all 等关键路径强制 flush；新增 3 个存储层回归测试
[2026-03-08 23:36:00] verification: npm run type-check ✅, npm test ✅ (69), npm run build ✅；构建 warning 仍是既有 vendor-charts ~563kB / vendor-antd ~718kB，后续继续拆包
[2026-03-08 23:50:00] task: 为本地 JSON 导入/恢复补充“备份作用域识别 + 模式不匹配拦截”，降低误把整库备份导入成单账户或反向误恢复的风险
[2026-03-08 23:50:00] deliverables: PersistedStateEnvelope 新增可选 scope=current|all；导出时写入 scope；导入预览识别 current/all/legacy-unknown；AppHeader 在导入前校验模式匹配并在整库恢复确认框展示文件类型；补 import-preview / finance-import-export 回归测试
[2026-03-09 00:03:00] task: 打磨图表可维护性与空数据体验，把 ECharts option 构建抽成纯函数并给长时间线补标签稀疏/动画降级策略
[2026-03-09 00:03:00] deliverables: 新增 src/utils/chart-options.ts；BalanceChart / CashFlowChart 接入共享 option builder；新增空数据态；补 chart-options 单测覆盖空时间线、长时间线、月度序列映射
[2026-03-09 00:20:00] task: 继续打磨长时间线余额图浏览效率，为图表加入默认聚焦时间窗与快捷定位（最新区间 / 今天 / 首次预警 / 最低点 / 最近对账）
[2026-03-09 00:20:00] deliverables: chart-options 新增默认 focus date / zoom window 纯函数；BalanceChart 增加快速定位工具条；补回归测试覆盖聚焦优先级与默认时间窗
[2026-03-09 00:20:00] verification: npm test ✅ (78), npm run type-check ✅, npm run build ✅；构建 warning 仍为 vendor-charts ~563kB / vendor-antd ~718kB，后续继续拆包
[2026-03-09 00:28:00] task: 打通“统计卡片 → 余额图快速定位”联动，减少长时间线下在卡片和图表之间来回找位置的成本
[2026-03-09 00:28:00] deliverables: 抽出 buildBalanceChartFocusTargets 作为共享聚焦目标源；StatisticsPanel 可点击跳转到 latest / warning / min / max；ChartArea 与 BalanceChart 通过 focusKey 单向联动；补 chart-options 回归测试覆盖 max/共享目标列表
[2026-03-09 00:29:00] verification: npm test ✅ (79), npm run type-check ✅, npm run build ✅；构建 warning 仍为 vendor-charts ~563kB / vendor-antd ~718kB
[2026-03-09 00:41:48] task: 为余额图快速定位增加焦点解释卡，直接说明最低点/首次预警/最近对账为何重要
[2026-03-09 00:41:48] deliverables: 新增 buildBalanceChartFocusInsight 纯函数；BalanceChart 展示焦点解释卡与当日事件摘要；补 chart-options 回归测试覆盖 warning/max/reconciliation 解释
[2026-03-09 00:41:48] verification: npm test ✅ (81), npm run type-check ✅, npm run build ✅；构建 warning 仍为 vendor-charts ~563kB / vendor-antd ~718kB
[2026-03-09 01:00:00] task: 收紧事件/账户创建表单的前置校验与日期约束，减少无效本地配置进入 store 后才报错的情况
[2026-03-09 01:00:00] deliverables: 新增 src/utils/event-form.ts 提取表单归一化/日期约束/前置校验；EventFormModal 增加起止/一次性日期 selectable 限制与提交时错误提示；CreateAccountModal 补账户名必填提示与 trim；新增 event-form 单测覆盖日期夹取、trim、年份非法组合与可选范围
[2026-03-09 01:02:00] verification: npm test ✅ (85), npm run type-check ✅, npm run build ✅；构建 warning 仍为 vendor-charts ~563kB / vendor-antd ~718kB
[2026-03-09 01:10:00] task: 打通“余额图点击日期点 → 打开事件抽屉 → 高亮对应规则事件”链路，减少用户在图表与事件清单之间手动查找的成本
[2026-03-09 01:10:00] deliverables: 新增 src/utils/event-focus.ts 提取图表日期到事件列表焦点的纯函数；BalanceChart 支持点击含事件的数据点；MainLayout / EventPanel 接入焦点状态、自动开抽屉、横幅说明、滚动到首条高亮事件；EventCard/EventList 增加高亮样式；补 event-focus 单测
[2026-03-09 01:18:00] verification: npm test ✅ (87), npm run type-check ✅, npm run build ✅；构建 warning 仍为 vendor-charts ~563kB / vendor-antd ~718kB
[2026-03-09 01:57:00] task: 打通“事件清单 → 图表日期”反向定位链路，补齐与“图表点 → 事件清单”相反方向的浏览闭环
[2026-03-09 01:57:00] deliverables: 新增 buildEventChartFocusState；事件卡增加“查看图上日期”；事件抽屉支持高亮当前定位事件、给出发生次数说明，并驱动余额图跳到对应日期；补 event-focus / chart-options 回归测试
[2026-03-09 02:02:00] verification: npm test ✅ (90), npm run type-check ✅, npm run build ✅；构建 warning 仍为 vendor-charts ~563kB / vendor-antd ~718kB
[2026-03-09 02:20:00] task: 为本地导入/恢复补一层“自动回滚快照 + 一键撤销”，降低误恢复整库或误导入错误备份后的不可逆风险
[2026-03-09 02:20:00] deliverables: storage 仓储新增 rollback snapshot；finance store 在 import current / import all 前自动保存回滚点并暴露 undoLastImport；账户管理面板新增“撤销上次导入/恢复”；补 storage / finance-import-export 回归测试
[2026-03-09 02:22:00] verification: npm test ✅ (92), npm run type-check ✅, npm run build ✅；新增回滚链路通过验证，构建 warning 仍为 vendor-charts ~563kB / vendor-antd ~718kB
[2026-03-09 02:35:00] task: 继续压缩图表大包，撤销把全部 ECharts/vue-echarts/zrender 强绑进单一 vendor-charts 的策略，改为按余额图/收支图分模块注册
[2026-03-09 02:35:00] deliverables: 新增 src/utils/echarts-balance.ts 与 src/utils/echarts-cashflow.ts；BalanceChart / CashFlowChart 分别按需注册图表能力；vite manualChunks 不再把所有图表依赖合并进 vendor-charts，恢复 Rollup 对异步图表 chunk 的自然拆分
[2026-03-09 02:40:00] verification: npm run type-check ✅, npm test ✅ (92), npm run build ✅；图表大包已从单一 vendor-charts ~563kB 拆为 BalanceChart ~59.6kB + CashFlowChart ~35.8kB + chart-options ~483.2kB，当前仅剩 vendor-antd ~718kB 为构建告警
[2026-03-09 02:43:00] task: 继续压缩应用壳第三方依赖，撤销把全部 Ant Design Vue 强绑进单一 vendor-antd 的策略，改为按基础组件 / 表单组件 / 反馈浮层 / 图标依赖拆分
[2026-03-09 02:43:00] deliverables: vite manualChunks 细分为 vendor-antd-core / vendor-antd-form / vendor-antd-feedback / vendor-antd-icons，并把 markdown-it、日期库单独拆仓，降低低频弹窗与主壳共享大包耦合
[2026-03-09 02:45:00] verification: npm run type-check ✅, npm test ✅ (92), npm run build ✅；构建告警中的 vendor-antd ~718kB 已消除，当前主要 chunk 为 vendor-antd-core ~397.8kB、vendor-antd-form ~195.4kB、vendor-antd-feedback ~91.2kB、vendor-markdown ~91.9kB、vendor-date ~43.5kB、chart-options ~483.2kB，全部低于默认 500kB 告警阈值
[2026-03-09 02:50:00] task: 修复 Vite 配置漂移并继续拆图表 option 共享块，避免“vite.config.ts 已优化但 build 仍命中旧 vite.config.js”的回退问题
[2026-03-09 08:07:00] task: 继续优化首页首开体感，把 ChartArea 中两张异步图表改成“进入视口后再挂载”，避免统计卡与事件侧栏还没看完就被 ECharts 初始化抢走主线程
[2026-03-09 08:07:00] deliverables: ChartArea 新增基于 IntersectionObserver 的图表延迟挂载与骨架占位；新增 src/components/charts/__tests__/ChartArea.test.ts 覆盖未入视口骨架与入视口后分别加载余额图/收支图
[2026-03-09 08:15:00] verification: npm test ✅ (133), npm run type-check ✅, npm run build ✅；构建仍保留既有 chart-balance-runtime ~556.3kB 告警，但现在首页首开不再必须立即执行该重图表异步块
[2026-03-09 08:42:00] task: 收紧本地存储迁移回写条件，并补齐单账户备份的明确风险分级，减少无意义 localStorage 回写与导入确认语义漂移
[2026-03-09 08:42:00] deliverables: storage.loadState 改为仅在字段缺失/非数组时判定需要迁移，不再把空 snapshots/reconciliations 误当成未迁移；import-preview 为 scope=current 增加低风险提示；补 storage / import-preview 回归测试
[2026-03-09 08:50:00] task: 打磨 AI 分析抽屉的本地连续性与上下文稳定性，避免未发送问题和流式请求在账户范围切换时串台
[2026-03-09 08:50:00] deliverables: AI 抽屉新增按账户 scope 保存/恢复未发送草稿；清空对话同步清空当前 scope 草稿；流式分析时锁定账户勾选并提示当前上下文已锁定；新增 AiAnalysisModal 组件级回归并扩展 ai-chat-history 测试
[2026-03-09 09:02:00] verification: npm test ✅ (143), npm run type-check ✅, npm run build ✅；构建产物仍保留既有 chart-balance-runtime ~556.26kB 告警，下一轮可继续拆余额图 runtime 或进一步延迟其内部重依赖初始化
[2026-03-09 02:50:00] deliverables: 删除历史编译产物 vite.config.js；新增 src/utils/chart-base.ts 与 src/utils/chart-options-cashflow.ts；收口 src/utils/chart-options.ts 为余额图专属逻辑；CashFlowChart 与图表测试改为按新模块引用
[2026-03-09 02:54:00] verification: npm test ✅ (92), npm run build ✅；构建已按 vite.config.ts 生效，默认 500kB 告警消失，主要 chunk 为 vendor-antd-core ~397.8kB / vendor-antd-form ~195.4kB / vendor-antd-feedback ~91.2kB / vendor-markdown ~91.9kB / vendor-date ~43.5kB / BalanceChart ~67.5kB / CashFlowChart ~39.5kB
[2026-03-09 03:00:00] task: 将事件表单中的 yearly/monthly 重复日期语义前移为即时字段提示，减少用户提交后才发现规则含义或非法月日组合的成本
[2026-03-09 03:00:00] deliverables: src/utils/event-form.ts 新增 monthly/yearly semantic hint 纯函数；EventFormModal 接入 help / validate-status；补 event-form 回归测试覆盖 31 日月末降级、2/29 平年降级、4/31 即时错误
[2026-03-09 03:03:00] verification: npm test ✅ (94), npm run type-check ✅, npm run build ✅；当前构建无默认 chunk 告警，残余较大共享异步块为 chart-base ~471.8kB，可作为下一轮继续拆分目标

[2026-03-09 03:18:38] task: 为事件清单补“同一规则多次发生日期前后切换”能力
[2026-03-09 03:20:21] deliverables: 事件图表定位支持同一规则的前后日期切换；event-focus 纯函数新增 occurrence index / matchedDates / step 导航
[2026-03-09 03:20:21] verification: npm run type-check ✅, npm test ✅ (95), npm run build ✅
[2026-03-09 03:28:00] task: 补强“图表点 → 事件抽屉”定位说明，把事件名扩展为账户级收支摘要，减少多账户视图下看不出这一天到底发生了什么的问题
[2026-03-09 03:28:00] deliverables: buildEventListFocusState 新增 detail 聚合（账户名/笔数/收入/支出/当日余额变动）；MainLayout 透传 accounts；EventPanel 横幅展示 detail；补 event-focus 回归测试覆盖账户映射与缺省 accountId 回退
[2026-03-09 03:44:00] task: 为事件表单补“规则预演”能力，让用户在提交前直接看到最近几次实际发生日期，降低对月末/闰年降级语义的理解成本
[2026-03-09 03:44:00] deliverables: src/utils/event-form.ts 新增 buildEventSchedulePreview 纯函数，复用 recurrence 规则推导最近发生日；EventFormModal 展示“接下来会这样发生”预演区块；补 event-form 回归测试覆盖 monthly 31 日短月降级、yearly 2/29 平年回退、禁用/非法规则不展示预演
[2026-03-09 03:44:00] verification: npm run type-check ✅, npm test ✅ (99), npm run build ✅；构建 chunk 告警仍已消除，chart-base ~471.8kB 仍是后续可继续拆分目标

[2026-03-09 03:50:00] task: 修正事件表单“接下来会这样发生”的时间语义，避免编辑旧规则时把历史发生日误当成未来预演
[2026-03-09 03:50:00] deliverables: buildEventSchedulePreview 新增 anchorDate（组件接入 store.todayStr）；预演从业务今天或开始日期（取较晚者）往后推导；补 event-form 回归测试覆盖未来锚点与开始日前锚点
[2026-03-09 04:05:00] task: 继续降低本地整库恢复误操作风险，把确认框从“文件摘要”升级为“风险分级 + 当前本地将被替换的后果说明”
[2026-03-09 04:05:00] deliverables: import-preview 新增 buildImportRiskSummary；AppHeader 的“恢复全部账户”确认框展示高/中风险提示、当前本地替换范围与作用域说明；补 import-preview 回归测试覆盖整库恢复与 legacy 未标记备份
[2026-03-09 04:14:00] task: 将事件表单“频率切换 → 字段显隐 / 默认值补齐”下沉为纯函数，避免组件模板继续散落条件判断
[2026-03-09 04:14:00] deliverables: src/utils/event-form.ts 新增 getEventFormVisibleSections / applyEventTypeDefaults；EventFormModal 改为复用纯函数控制区块显隐与频率切换默认值；补 event-form 回归测试覆盖字段区块与默认值补齐；新增 docs/worker-2026-03-09-event-form-followup.md 记录本轮任务切换原因
[2026-03-09 04:14:00] verification: npm test ✅ (105), npm run type-check ✅, npm run build ✅；chart-base 仍为共享异步大块，确认其主要是 ECharts 运行时本体，本轮未继续硬拆
[2026-03-09 04:24:00] task: 继续打磨事件表单即时反馈，把起始日期 / 结束日期 / 一次性发生日期的越界错误前移到字段旁展示，避免只在提交时 toast
[2026-03-09 04:24:00] deliverables: src/utils/event-form.ts 新增 getEventFormDateFeedback；EventFormModal 接入日期字段级 validate-status/help；补 event-form 回归测试覆盖起止日期倒挂与 onceDate 超出范围；同步更新 CHANGELOG / NEXT_TASK
[2026-03-09 04:35:00] task: 把事件表单上一轮纯函数改造补齐到组件级交互回归，避免“逻辑函数过了但模板接线回归”
[2026-03-09 04:35:00] deliverables: 新增 src/components/events/__tests__/EventFormModal.test.ts，覆盖频率切换字段显隐、预演区块显示/隐藏、起止/发生日期字段级错误、非法提交阻断；引入 @vue/test-utils 作为 Vue 组件测试基础能力
[2026-03-09 04:47:00] task: 修正事件表单默认日期的时间语义漂移，统一使用业务 today 而不是系统当前时间
[2026-03-09 04:47:00] deliverables: EventFormModal 的默认 startDate/onceDate、频率切换补默认值、提交兜底日期全部改为复用 store.todayStr，保证模拟日期 / 预演锚点 / 表单默认值一致
[2026-03-09 04:49:00] verification: npm test ✅ (110), npm run type-check ✅, npm run build ✅；组件级测试已打通，chart-base ~471.8kB 仍是下一轮主要本地优化目标
[2026-03-09 05:05:00] task: 继续降低整库恢复误操作风险，把确认框里的“当前本地 vs 备份文件”差异从抽象风险说明升级为账户名级新增/移除/保留摘要
[2026-03-09 05:05:00] deliverables: src/utils/import-preview.ts 新增 buildImportAccountDiffSummary；AppHeader 的恢复全部账户确认框展示账户差异速览；补 import-preview 回归测试覆盖新增/移除/保留与脏数据去噪
[2026-03-09 05:20:00] task: 继续降低整库恢复误操作风险，把确认框里的“当前本地 vs 备份文件”差异从账户名级扩展到数据规模净增减摘要
[2026-03-09 05:20:00] deliverables: src/utils/import-preview.ts 新增 buildImportDataDeltaSummary；AppHeader 的恢复全部账户确认框展示账户 / 事件 / 对账 / 账本 / 覆盖记录的恢复前后净变化；补 import-preview 回归测试覆盖净增减计算；同步更新 CHANGELOG / NEXT_TASK
[2026-03-09 05:20:00] verification: npm test ✅ (113), npm run type-check ✅, npm run build ✅；构建默认 chunk 告警仍已消除，chart-base ~471.84kB 仍是下一轮可继续优化目标
[2026-03-09 05:32:00] task: 给高风险导入/恢复 UI 补组件级回归，避免账户差异/数据规模提示与撤销入口只在纯函数层被覆盖
[2026-03-09 05:32:00] deliverables: 新增 src/layouts/__tests__/AppHeader.test.ts，覆盖“恢复全部账户”确认框里的账户差异与数据规模变化接线，以及“撤销上次导入”在账户管理中的可见性、确认框摘要和真实回滚执行
[2026-03-09 05:33:00] verification: npm test ✅ (115), npm run type-check ✅, npm run build ✅；高风险导入/撤销流现已同时具备 store / pure util / 组件接线三层回归，chart-base ~471.84kB 仍是后续主要性能优化点
[2026-03-09 05:40:00] task: 给余额图“快速定位条 + 焦点解释卡”补组件级回归，避免图表交互继续只靠纯函数测试兜底
[2026-03-09 05:40:00] deliverables: 新增 src/components/charts/__tests__/BalanceChart.test.ts，覆盖空态、快速定位切换、外部 focusKey/focusDate 联动、仅含事件点触发 select-date；同时在补测中发现并修复默认焦点优先级 bug：当“今天”和“首次预警”落在同一天时，默认焦点现在按 warning > today > reconciliation 的 key 优先级稳定命中，而不再按日期误落到第一个按钮
[2026-03-09 05:45:00] verification: npm test ✅ (120), npm run type-check ✅, npm run build ✅；新增图表组件级回归已纳入全量验证，当前主要性能余项仍是 chart-base ~471.84kB
[2026-03-09 05:55:00] task: 继续降低整库恢复误操作风险，把确认框里的差异从“总量变化”再细化为“按账户的数据变化 + 日期覆盖范围”
[2026-03-09 06:00:00] deliverables: src/utils/import-preview.ts 新增 buildImportAccountDataDeltaSummary / buildImportDateRangeSummary；AppHeader 的恢复全部账户确认框展示按账户的事件/对账/账本/覆盖变化，以及当前本地 vs 备份文件的日期覆盖范围；补 import-preview / AppHeader 回归测试
[2026-03-09 06:18:00] task: 继续降低整库恢复误操作风险，补“备份是否明显比当前本地旧”的直接预警，减少用户只看日期范围却没快速意识到是旧备份的情况
[2026-03-09 06:18:00] deliverables: src/utils/import-preview.ts 新增 buildImportFreshnessSummary；AppHeader 的恢复全部账户确认框展示“备份时间新旧正常 / 旧备份预警”与最新业务日期对比；补 import-preview / AppHeader 回归测试
[2026-03-09 06:20:00] verification: npm run type-check ✅, npm test ✅ (125), npm run build ✅；构建默认 chunk 告警仍已消除，chart-base ~471.84kB 仍是下一轮主要性能优化点
[2026-03-09 06:32:00] task: 把整库恢复确认信息继续从“数量 diff”推进到“按账户的事件规则名级 diff”，避免用户知道会增减几条事件却仍不清楚具体会替换掉哪些规则
[2026-03-09 06:32:00] deliverables: src/utils/import-preview.ts 新增 buildImportAccountEventDiffSummary；AppHeader 的恢复全部账户确认框展示“按账户的事件规则变化”；补 import-preview / AppHeader 回归测试覆盖新增事件、移除事件、按账户聚合与去重语义
[2026-03-09 06:36:00] verification: npm run type-check ✅, npm test ✅ (126), npm run build ✅；当前恢复确认流已具备账户名 / 数据规模 / 日期范围 / 备份新旧 / 事件规则名级 diff 五层提示，下一轮仍可继续攻 chart-base ~471.84kB 性能余项
[2026-03-09 06:48:00] task: 继续压缩图表共享异步块，避免余额图与收支图因注册入口被 Rollup 再次揉回同一个 chart-base 依赖链
[2026-03-09 06:48:00] deliverables: vite manualChunks 为 src/utils/echarts-balance.ts 与 src/utils/echarts-cashflow.ts 增加独立 runtime chunk；BalanceChart / CashFlowChart 继续共用轻量 chart-base 工具，但各自图表注册 runtime 改为按需异步装载
[2026-03-09 06:48:00] verification: npm run test ✅ (126), npm run type-check ✅, npm run build ✅；构建产物已从 chart-base ~471.84kB 收敛为 chart-base ~4.28kB + chart-balance-runtime ~556.26kB + chart-cashflow-runtime 独立小块，显著降低两张图之间的共享耦合；当前仅余额图 runtime 仍触发 >500kB warning，可作为下一轮继续细拆目标
[2026-03-09 06:58:00] task: 把“事件清单 → 图表日期”定位继续从顺序切换推进到“全部发生日总览”，减少高频规则只能上一个/下一个来回试探的成本
[2026-03-09 06:58:00] deliverables: buildEventChartFocusState 新增发生日总览 detail；EventPanel 定位横幅展示全部发生日 chip 并支持点击任意日期跳图；新增 EventPanel 组件级回归并扩展 event-focus 纯函数测试
[2026-03-09 07:29:00] task: 给图表容器层补组件级联动回归，验证“统计卡片 → 余额图”和“外部日期定位 → 余额图”真实接线
[2026-03-09 07:29:00] deliverables: 新增 src/components/charts/__tests__/ChartArea.test.ts；覆盖 stats focusKey、focusDate/focusNonce、select-date 回传与 TimeRangeControl 接线；补测中发现并修复 ChartArea 对外部 focusDate 监听未 immediate 的问题，首次挂载时现在会立刻把日期传给余额图
[2026-03-09 07:45:00] task: 打磨多账户视图入口，让弹窗打开时自动补齐可汇总整组账户，而不是只保留单个当前账户
[2026-03-09 07:45:00] deliverables: AccountMultiSelectModal 新增“同最新对账日整组自动预选 + 无基准时回退到人数最多且日期最新的可汇总组”；新增 src/components/account/__tests__/AccountMultiSelectModal.test.ts 覆盖自动预选、分组回退与单账户阻断确认
[2026-03-09 07:52:00] verification: npm test -- AccountMultiSelectModal ✅, npm run type-check ✅；全量 npm test / npm run build 已启动，待结果回填
[2026-03-09 08:25:00] task: 给账户管理里的危险操作补组件级回归，避免“清空当前账户 / 删除账户”只在 store 层有测试而缺少真实界面接线验证
[2026-03-09 08:28:00] deliverables: 扩展 src/layouts/__tests__/AppHeader.test.ts；新增“清空当前账户”与“删除账户”两条组件级测试，覆盖账户管理弹层到确认框的接线、错误确认文案拦截、以及确认后的真实 state 变化与账户切换
[2026-03-09 08:29:00] verification: npm test ✅ (135), npm run type-check ✅, npm run build ✅；本轮把账户危险操作也补齐到组件层，当前主要性能余项仍是 chart-balance-runtime ~556.26kB
[2026-03-09 09:16:00] task: 给账户管理里的导入/导出按钮补组件级接线回归，避免高风险文件流继续只靠 store / 纯函数测试兜底
[2026-03-09 09:16:00] deliverables: 扩展 src/layouts/__tests__/AppHeader.test.ts；新增“导入当前账户误选整库备份拦截不污染本地状态”与“导出当前/全部账户走对模式并生成对应文件名”两条组件级测试；顺手统一了测试里的账户名断言，避免被前序状态污染
[2026-03-09 10:18:00] task: 收口账户管理文件导入的失败分支，给 FileReader onerror 真正补 UI 级回归，避免读取失败时悄悄卡在错误模式
[2026-03-09 10:18:00] deliverables: AppHeader 的 handleFileChange 增加 reader.onerror 与统一 resetImportState；扩展 src/layouts/__tests__/AppHeader.test.ts，覆盖“恢复全部账户/导入当前账户在文件读取失败时分别提示错误，且不会误弹确认框”的组件级回归；同步更新 CHANGELOG

- 2026-03-11 | feat(events): 事件面板新增「导出」下拉按钮：可将当前视图事件一键导出为 CSV 或 JSON（多账户视图会包含账户名列）。
  - Why: 用户想在 Excel/表格做二次分析或归档时，不用手动复制粘贴；也便于把规则备份到其他工具。
  - Verify: npm test; npm run type-check; npm run build
  - Commit: d45f0ef

- 2026-03-11 | feat(charts): 余额图焦点解释卡新增「导出当日事件」：将当前焦点日期下的事件列表导出为 CSV（含日期/事件/收支/金额/账户）。
  - Why: 焦点解释卡里看到了“当日发生了什么”，下一步常见诉求就是把这天的明细快速导出来做对账/报销/复盘，不必切到事件面板再筛。
  - Verify: npm test; npm run type-check
  - Commit: 5b35b93

- 2026-03-11 | feat(charts): 月度收支图新增「导出 CSV」按钮：一键导出月份/收入/支出/净额，便于粘贴到表格做复盘。
  - Why: 月度汇总是最常被拿去做对比/年终统计的口径；导出可避免手抄或截图。
  - Verify: npm test; npm run type-check
  - Commit: 1aef5f7

- 2026-03-12 | fix(ai): 修复财务分析助手流式首包前断流 empty_stream 的可恢复错误处理。
  - Why: 上游流式连接在首包前断开时，之前会把失败误判成“分析结束”或留空白输出；同时缺少明确恢复路径与足够日志，用户只能手工重试。
  - Deliverables: `streamChat` 新增首包超时/总超时 abort、首包前空流结束判定为 `empty_stream`、结构化 `AiRequestError`（provider/model/trace id/code/type）；AI 抽屉新增“分析未完成，但可以恢复”横幅、保留草稿/继续编辑/直接重试，并记录错误元信息到控制台日志。
  - Verify: npm test; npm run type-check

- 2026-03-13 | perf(ai): 降低财务分析助手流式输出时的滚动与渲染压力（scroll-to-bottom 节流）。
  - Why: 流式输出每个 chunk 都触发一次 `nextTick + scrollTop`，在长回答或高频 chunk 场景会造成明显的卡顿与掉帧。
  - Deliverables: 在 `AiAnalysisModal` 内新增 `scheduleScrollToBottom()`，把多次滚动请求合并到同一帧（优先 `requestAnimationFrame`，降级为 microtask/Promise）；并在流式 chunk 更新与消息追加处统一改用该节流方法。
  - Verify: npm test; npm run type-check; npm run build

## 2026-03-14 23:10 CST
- commit: 8b4f173 chore: unblock validation and confirm ai retry flow
- validation: npm test && npm run type-check && npm run build
- note: Confirmed empty_stream auto-retry/diagnostics tests pass; removed unused formatYearMonth helper blocking type-check.
[2026-03-15 01:09:00] task: confirm P0 empty_stream mitigation is on origin/main and close remaining diagnostics gap in Cloudflare ai-proxy
[2026-03-15 01:09:00] deliverables: confirmed front-end auto retry + recovery tests already present on main; added Cloudflare ai-proxy response header forwarding for x-trace-id/trace-id/x-request-id/request-id/cf-ray and cache-control so production diagnostics panel can copy provider/model/traceId/httpStatus/retryCount more reliably after upstream first-packet disconnects
[2026-03-15 01:09:00] validation: npm test && npm run type-check && npm run build
[2026-03-15 01:09:00] commit: 963cf25 ai-proxy: forward upstream trace/request headers
