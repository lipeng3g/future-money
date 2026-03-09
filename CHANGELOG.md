# Changelog

## 2026-03-10

- fix(view-range): 首页“预测范围”切换现在会同步写回 `preferences.defaultViewMonths`。此前 `setViewMonths()` 只改了运行时 `viewMonths`，但持久化仍保留旧默认值，导致用户把 12/24/36 个月切到新范围后，一刷新页面又悄悄回到旧值；现在本地选择会稳定跨刷新保留。
- test(view-range): 扩展 `src/stores/__tests__/finance-import-export.test.ts`，新增“切换预测范围后 localStorage 中的 `defaultViewMonths` 会同步更新，并能通过持久化状态恢复出相同范围”的回归，锁住这个本地持久化行为，避免首页时间窗再次出现‘看起来切了、重开又丢’的回退。
- ux(event-toggle): 事件面板里的启停开关现在在操作成功后也会给出明确反馈：关闭时提示“已暂停事件”，重新开启时提示“已启用事件”。这样事件管理的成功/失败反馈终于和新增、编辑、删除保持一致，不再只靠开关视觉状态让用户自己猜测是否真的生效。
- test(event-toggle): 扩展 `src/components/events/__tests__/EventPanel.test.ts`，把原本只断言 store 状态变化的启停测试升级为“暂停成功提示 + 重新启用成功提示”的双向回归，同时继续保留 toggle/delete 失败分支保护，锁住事件管理反馈语义。
- test(ai-modal): 扩展 `src/components/ai/__tests__/AiAnalysisModal.test.ts`，补“未配置 API 时点击预设不会误发请求而是打开设置弹窗”“导出对话会按当前账户 scope 传递消息并给出成功提示”两条组件级回归；把 AI 抽屉的高风险本地交互从中止流/草稿作用域继续补到配置门禁与导出接线，降低后续 UI 轻微重构时把真实用户入口悄悄弄坏的风险。
- refactor(chart-runtime): 新增 `src/utils/use-chart-runtime.ts`，把图表组件里重复的 `onMounted -> ensureReady()` 异步加载接线抽成共享组合式 hook；余额图 / 月度图继续复用既有 `createAsyncChartRuntime()` 状态机，但 mounted 生命周期与加载胶水代码不再散落在两个组件里，后续若继续调整图表 runtime 初始化策略只需改一处。
- test(chart-runtime): 新增 `src/utils/__tests__/use-chart-runtime.test.ts`，覆盖“组件挂载后会自动触发 runtime 加载”的共享接线语义；同时扩展 `src/components/charts/__tests__/CashFlowChart.test.ts`，补齐“runtime 首次失败时展示错误态，点击重试后恢复渲染”回归，继续锁住本地图表 chunk 失败后的自恢复体验。
- test(event-list): 新增 `src/components/events/__tests__/EventList.test.ts`，把事件列表从父层 stub 回归补到 `EventList + EventCard` 真组件组合：现在会直接锁住高亮样式、图表定位入口、只读态开关禁用/编辑删除隐藏，以及可编辑态下 `toggle / edit / delete` 的真实冒泡，避免事件面板测试只验证父层事件名，却漏掉子卡片实际语义回退。
- ux(import-preview): 单账户导入与整库恢复的确认框现在会额外展示 `sanitize 过滤统计`，直接列出账户 / 事件 / 对账 / 账本 / 覆盖记录在“原始备份 → sanitize 后”各自被过滤了多少，以及常见过滤原因；用户在确认前就能看见坏字段、断裂引用或脏数据到底丢了多少，不再只知道“系统会过滤”却不知道影响范围。
- test(import-preview): 扩展 `src/utils/__tests__/import-preview.test.ts` 与 `src/layouts/__tests__/AppHeader.test.ts`，补 `sanitize 过滤统计` 的纯函数与确认框接线回归，锁住单账户导入 / 整库恢复两条高风险 UI 链路的摘要一致性。
- stability(import): 导入/恢复流程在预览前先做统一 envelope 解析，非法 JSON 与缺少 `state` 的备份会返回稳定、可读的错误提示，不再依赖底层 `JSON.parse` 原始异常文案。
- test(import): 为 storage 与 AppHeader 导入 smoke 补充坏 JSON、缺少 state 的回归覆盖，确保错误发生时不会误弹确认框。

## 2026-03-10
- ux(event-edit): 事件编辑/新增提交失败时，表单弹窗现在会保留打开，并在弹窗底部直接展示明确错误文案；用户不再只能看一闪而过的全局 toast 后自己回忆哪里填错了，尤其适合修改已有规则时边看边修
- test(event-edit): 扩展 `src/components/events/__tests__/EventPanel.test.ts`，新增“编辑失败时弹窗保持打开且展示错误”的组件级回归，锁住 EventPanel 与 EventFormModal 的真实接线语义，防止后续再次退回到失败即关窗或错误无落点
- test(event-card): 新增 `src/components/events/__tests__/EventCard.test.ts`，补齐 EventCard 真组件下的只读展示/禁用语义回归：现在会明确锁住“只读时开关禁用、编辑/删除按钮隐藏”，避免事件面板只读保护只在父层存在、子卡片真实交互却悄悄回退

## 2026-03-09
- ux(event-readonly): 事件面板在多账户汇总 / 历史快照两类只读视图下，新增显式原因横幅，直接说明为什么此时只能查看与定位、不能新增/编辑/删除/启停事件，避免用户只看到按钮灰掉却不明白限制来自哪里
- safety(event-readonly): `EventPanel` 现在对新增、编辑、删除、启停、载入示例五类修改动作补了运行时只读守卫；即便后续子组件误透传事件或按钮禁用接线回退，也不会在只读视图里偷偷改动本地规则
- test(event-readonly): 扩展 `src/components/events/__tests__/EventPanel.test.ts`，新增“多账户只读会展示原因且阻止编辑类操作”“历史快照只读会阻止新增事件”两条组件级回归，继续把事件管理的高风险边界锁到真实 UI 行为层
- test(event-panel): 扩展 `src/components/events/__tests__/EventPanel.test.ts`，把事件面板的高风险 UI 接线从“只测图表定位”补到“编辑事件写回 store、启停开关真正生效、删除确认会清理焦点、载入示例口令错误不覆盖/正确才覆盖”整条组件级闭环，避免事件管理核心操作继续只靠 store 逻辑或手工回归兜底
- smoke(ui-import): 新增 `src/layouts/__tests__/AppHeaderImportUndo.smoke.test.ts`，把“账户管理 → 导入当前账户 → 检查 sanitize 后确认摘要与事件规则 diff → 确认导入 → 撤销上次导入”收口成可重复执行的 DOM 级烟雾测试；不引入 Playwright 也能自动覆盖最脆弱的高风险 UI 链路
- smoke(script): `npm run smoke` 现在同时执行 store 级 smoke 与 AppHeader UI 级 smoke，避免导入/撤销只在手册或零散组件断言里验证，后续每轮都能一键回归本地高风险导入路径
- docs(validation): README 增补本地验证章节，明确 `npm test / npm run type-check / npm run build / npm run smoke` 的推荐验证顺序与 smoke 覆盖范围
- chart: 为首页图表延迟挂载补“超时兜底加载”机制；即使 `IntersectionObserver` 在后台标签页、低功耗模式或兼容性异常场景下迟迟不触发，余额图与月度图也会按顺序自动揭示，避免用户永久停留在骨架屏
- test: 扩展 `src/components/charts/__tests__/ChartArea.test.ts`，覆盖 observer 正常触发与 fallback 定时器兜底两条路径，锁住“先让出首屏交互、但不允许永久白骨架”的真实语义

## 2026-03-09

- stability(chart-runtime): 抽出 `src/utils/chart-runtime.ts` 统一管理图表 runtime 的异步加载状态；余额图 / 月度图现在具备一致的“加载中 → 成功”状态机基础能力，并为后续 UI 级失败兜底 / 重试保留了可测试的共享落点，避免 runtime 处理继续散落在各个组件里
- test(chart-runtime): 新增 `src/utils/__tests__/chart-runtime.test.ts`，覆盖“并发 ensureReady 只触发一次真实加载”“首次失败后允许 retry 恢复”两条回归；同时保留 `BalanceChart` / `CashFlowChart` 组件级测试对“runtime ready 前先显示加载态、完成后再挂图表”的真实 UI 语义覆盖
- stability(chart-runtime): 余额图 / 月度图的运行时加载失败现在会显示统一的错误卡片与“重试加载”入口，而不是让图表区域静默卡在空白/加载态；即便后续遇到浏览器扩展、缓存损坏或临时 chunk 读取失败，用户也有明确反馈与自助恢复路径
- perf(chart-runtime): 余额图 / 月度图现在会在组件挂载后再异步加载各自的 ECharts 注册模块，而不是在图表组件求值阶段就静态引入；这样首页未滚动到图表区、或图表仍处于空态时，不会被 `chart-balance-runtime` / `chart-cashflow-runtime` 提前拖入当前渲染路径，图表组件自身异步壳体也进一步收轻
- test(chart-runtime): 调整 `src/components/charts/__tests__/BalanceChart.test.ts`，并新增 `src/components/charts/__tests__/CashFlowChart.test.ts`，显式覆盖“runtime ready 前先显示轻量加载态、完成后再挂真实图表”的组件语义，避免后续把 ECharts 注册重新绑回同步顶层 import 时无人发现
- note(build): 本轮重新验证后确认 `dist/assets/BalanceChart-*.js` 已收口到约 `11.8kB`，但 `chart-balance-runtime` 仍约 `556kB`；结论是当前大块主要来自 ECharts runtime 本体而非余额图 UI/option 代码，下一轮若继续拆分应优先研究 runtime 级按需能力，而不是再继续切自家业务组件
- chore(gitignore): 将 `vite.config.ts.timestamp-*.mjs` 加入 `.gitignore`，避免本地 `vite preview` / 探活验证后生成的 Vite 临时时间戳模块污染工作区，降低自治验证与用户手工开发之间的噪音
- test(validation): 再次完整执行 `npm install`、`npm test`、`npm run type-check`、`npm run build`、`npm run smoke` 与 `npm run preview -- --host 127.0.0.1 --port 4175 + curl -I`，确认当前导入/恢复与 UI 回归链路在不新增依赖的前提下仍可重复通过
- test(smoke-browser): 将 `scripts/browser-import-smoke.mjs` 收口为零依赖测试夹具生成脚本，并新增 `docs/browser-import-smoke.md` 记录基于 vite preview + OpenClaw/browser 的真实页面级 smoke 步骤；页面级导入/撤销闭环现在可按仓库内文档重复执行，但尚未接入 npm 全自动脚本
- safety(import-current): 单账户导入确认框现在会直接展示“当前账户事件规则 diff”，按规则名列出将新增 / 移除 / 保持存在的事件，避免用户只看到导入后总量和备份规则清单，却看不出当前账户本地哪些规则会被替掉
- test(import-current): 扩展 `src/utils/__tests__/import-preview.test.ts` 与 `src/layouts/__tests__/AppHeader.test.ts`，补单账户事件规则 diff 的纯函数回归与确认框接线断言
- test(import): 扩展 `src/utils/__tests__/storage.test.ts`，把导入值级净化回归从“非法日期 / NaN”继续补到“空白账户名、异常事件分类、异常快照来源、异常账本来源、异常 override 动作”等更贴近真实坏备份的脏值组合，确保本地导入只保留可安全落地的数据
- test(smoke): 新增 `src/stores/__tests__/finance-smoke.test.ts` 与 `npm run smoke`，把“导出全部账户 → 清空当前账户 → 恢复全部账户 → 撤销恢复”的本地闭环收口成可重复执行的 CLI 级烟雾验证，后续每轮都能快速确认导入/恢复关键路径未被回归破坏
- fix(ai): AI 分析抽屉现在会在关闭抽屉、组件卸载或账户范围变化时主动中止流式请求，并通过 requestId 屏蔽旧请求的过期回灌；避免用户已经切走上下文后，旧响应仍把内容写回当前本地对话
- test(ai): 扩展 `src/components/ai/__tests__/AiAnalysisModal.test.ts`，补“关闭抽屉即中止流式请求”“分析中切换账户范围后旧请求结果不再写回”两条组件级回归，继续把 AI 本地稳定性问题锁到真实 UI 行为层
- fix(import): 导入/恢复阶段新增状态净化，自动剔除断裂引用、跨账户脏数据与重复 ID，避免坏链路污染本地账本与对账数据
- test(storage): 补充导入净化测试，覆盖缺失账户、失效规则引用、失效对账引用、重复记录与偏残缺 preferences 的恢复行为

## 2026-03-09
- stability(ai): AI 分析抽屉现在会在关闭抽屉、组件卸载或账户范围变化时主动中止流式请求，并通过 requestId 屏蔽旧请求的过期回灌；避免用户已经切走上下文后，旧响应仍把内容写回当前本地对话
- test(ai): 扩展 `src/components/ai/__tests__/AiAnalysisModal.test.ts`，补“关闭抽屉即中止流式请求”“分析中切换账户范围后旧请求结果不再写回”两条组件级回归，继续把 AI 本地稳定性问题锁到真实 UI 行为层
- absorb(build): 已吸收并保留用户在 `origin/main` 的两次构建修复：`909d43c` 先把 `@ant-design/icons-vue` 并回 antd 主 chunk，`2f918d8` 再把全部 `ant-design-vue` / `@ant-design/icons-vue` 合并到单一 `vendor-antd`，用于消除子 chunk 间 ESM 循环依赖导致的运行时未初始化崩溃；本轮开发未回退该修复边界
- fix(import-ui): 账户管理里的“恢复全部账户 / 导入当前账户”现在对 `FileReader.onerror` 做了显式兜底；当浏览器读取备份文件失败时，会立即给出对应模式的错误提示，并统一重置导入模式与 input 状态，避免后续操作串到错误模式
- test(import-ui): 扩展 `src/layouts/__tests__/AppHeader.test.ts`，补“恢复全部账户读取失败”“导入当前账户读取失败”两条组件级回归，确保读取失败时不会误弹确认框，也不会残留错误导入状态
- ux(ai): AI 分析抽屉现在会按当前账户范围单独保存未发送草稿；单账户、多账户组合各自恢复自己的输入内容，减少切换视图或中途关闭抽屉后重新组织问题的成本，也避免不同账户上下文把半成品问题串在一起
- safety(ai): AI 流式分析进行中会临时锁定账户范围切换，并在账户栏明确提示“当前上下文已锁定”；避免请求已经基于一组账户发出后，用户又把勾选范围切走，导致界面显示范围与本次分析上下文不一致
- test(ai): 新增 `src/components/ai/__tests__/AiAnalysisModal.test.ts` 组件级回归，覆盖“按 scope 恢复草稿”“清空对话时同步清空草稿”“流式中锁定账户范围并在结束后恢复”三条关键交互；同时扩展 `src/utils/__tests__/ai-chat-history.test.ts`，补草稿 scope key、旧版全局草稿兼容与空白草稿不落盘回归
- perf(storage): `LocalStorageStateRepository.loadState()` 现在只在字段缺失或类型异常时才判定需要迁移并回写本地存储；对于已经是合法空数组的 `snapshots / reconciliations / ledgerEntries / eventOverrides`，不再误判成“未迁移”并在每次打开应用时多做一次无意义 `localStorage` 写入
- safety(import): 导入预览的风险分级新增 `scope=current` 的明确低风险提示；单账户备份不再被笼统落到“旧版/未标记备份”，恢复语义更清楚，也为后续单账户导入/恢复确认流留下更准确的风险基线
- test(storage): 扩展 `src/utils/__tests__/storage.test.ts`，新增“空数组字段不会触发重复迁移回写”回归，避免本地持久化层再次因为空集合被误判而反复落盘
- test(import-preview): 扩展 `src/utils/__tests__/import-preview.test.ts`，补单账户备份低风险提示回归，防止导入确认的风险文案再次漂移
- perf(chart-loading): `ChartArea` 里的余额图和月度收支图改为“进入视口后再真正挂载异步图表组件”，首屏先展示轻量骨架，占位同时把交互机会优先让给统计卡、事件入口和即将发生列表，降低打开首页时被重图表初始化拖慢的体感
- test(chart-loading): 新增 `src/components/charts/__tests__/ChartArea.test.ts`，真实覆盖“未进入视口前仅显示骨架”“余额图 / 月度图分别在各自卡片进入视口后才加载”的组件级回归，避免按需加载被无意回退
- ux(multi-account): 多账户选择弹窗打开时，现在会优先自动补齐“与当前入口账户同一最新对账日”的整组可汇总账户，而不是只保留单个当前账户；若当前入口没有可用基准，则会回退到“人数最多且日期最新”的可汇总账户组，减少用户每次都要手动再勾一遍的成本
- test(multi-account): 新增 `src/components/account/__tests__/AccountMultiSelectModal.test.ts` 组件级回归，覆盖“同对账日整组自动预选”“入口账户无基准时自动回退到最佳可汇总组”以及“只剩一个账户时阻断确认”三条关键交互，避免多账户入口再次退回到只能手工试探
- test(account-danger): 扩展 `src/layouts/__tests__/AppHeader.test.ts`，补“清空当前账户 / 删除账户”两条高风险操作的组件级回归，真实覆盖账户管理面板到确认框的接线、错误口令拦截，以及确认后的真实清空/删除结果，避免这些危险动作只靠 store 单测兜底
- test(account-import-export): 继续扩展 `src/layouts/__tests__/AppHeader.test.ts`，补“导入当前账户时误选整库备份会被拦截且不污染现有本地状态”“导出当前/全部账户按钮会走对模式并生成对应文件名”，以及“文件读取失败时应按 current/all 模式分别提示错误并重置导入流”三条组件级回归，把账户管理里的文件流高风险接线也纳入真实界面测试
- fix(chart-focus): `ChartArea` 现在会在首次挂载时立刻把外部传入的 `focusDate` 同步给余额图，不再需要等第二次 prop 变化；修复了“事件清单首次打开就要求跳图，但余额图初始仍停在默认焦点”的接线缺口
- test(chart-ui): 新增 `src/components/charts/__tests__/ChartArea.test.ts` 组件级回归，真实覆盖“统计卡片 → 余额图 focusKey”“外部 focusDate/focusNonce → 余额图 focusDate”以及“余额图点击日期 → 回传给父层”三条联动链路，避免图表容器层继续只靠纯函数测试兜底
- feat(event-navigation): 事件抽屉里的图表定位横幅新增“当前时间窗内发生日”总览；当某条规则在当前时间窗出现多次时，现在会直接列出所有发生日期，并允许点击任意日期跳图，不再只能靠“上一个 / 下一个日期”来回试探
- test(event-navigation): 新增 `src/components/events/__tests__/EventPanel.test.ts` 组件级回归，覆盖事件定位横幅里的发生日列表渲染、激活态切换与点击跳图，避免这条浏览链路只剩纯函数测试兜底
- test(event-focus): 扩展 `src/utils/__tests__/event-focus.test.ts`，补图表定位状态中的发生日总览文案断言，避免多次发生日期的说明与组件展示再次漂移
- safety(import): “恢复全部账户”确认框新增“按账户的事件规则变化”摘要；现在除了账户名、总量变化和日期覆盖范围外，还会直接提示每个账户有哪些事件规则会新增/移除，减少用户在恢复前自己脑补“这份备份到底会把哪些业务规则换掉”的成本
- test(import-preview): 扩展 `src/utils/__tests__/import-preview.test.ts`，补按账户事件名增删聚合回归，避免事件规则 diff 在账户迁移、重名事件或脏数据下再次漂移
- test(import-ui): 扩展 `src/layouts/__tests__/AppHeader.test.ts`，真实覆盖整库恢复确认框里的“按账户的事件规则变化”接线，继续把高风险恢复流的提示从纯函数补到组件层
- safety(import): “恢复全部账户”确认框新增“备份新旧程度”提示；当备份文件的最新业务日期明显早于当前本地时，会直接提示这可能是一份偏旧备份，并展示“当前本地最新日期 / 备份文件最新日期”，帮助在确认前更快识别“旧备份覆盖新数据”的风险
- test(import-preview): 扩展 `src/utils/__tests__/import-preview.test.ts`，补“旧备份预警 / 日期不早于当前本地”的回归，避免备份新旧判断再次漂移
- test(import-ui): 扩展 `src/layouts/__tests__/AppHeader.test.ts`，真实覆盖整库恢复确认框中的“备份时间新旧正常 / 旧备份预警”接线，继续把高风险恢复流的提示从纯函数补到组件层
- safety(import): “恢复全部账户”确认框新增“按账户的数据变化 + 日期覆盖范围”摘要；除了总量变化外，现在还能直接看出哪几个账户的事件/对账/账本/覆盖记录会增减，以及当前本地与备份文件的时间跨度是否明显错位，进一步降低误恢复旧备份或错备份的风险
- test(import-preview): 扩展 `src/utils/__tests__/import-preview.test.ts`，新增按账户变化聚合与日期覆盖范围摘要回归，避免确认框提示与真实恢复内容脱节
- test(import-ui): 扩展 `src/layouts/__tests__/AppHeader.test.ts`，真实覆盖“恢复全部账户”确认框里的按账户变化与日期覆盖范围接线，继续把高风险恢复流的回归从纯函数补到组件层
- test(chart-ui): 新增 `src/components/charts/__tests__/BalanceChart.test.ts` 组件级回归，真实覆盖余额图空态、快速定位条切换、外部 focusKey / focusDate 联动，以及“只有含事件的数据点才触发 select-date”，避免图表交互继续只靠纯函数测试兜底
- fix(chart-focus): 修正余额图默认焦点优先级在“今天”和“首次预警”落在同一天时被错误回落到“今天”的问题；现在默认焦点会按 key 优先级稳定命中 warning / today / reconciliation，而不是仅按日期反查第一个按钮
- test(chart-focus): 扩展 `src/utils/__tests__/chart-options.test.ts`，补“今天与首次预警同日时仍应优先落到 warning”回归，避免默认焦点语义再次漂移
- test(import-ui): 新增 `src/layouts/__tests__/AppHeader.test.ts` 组件级回归，真实覆盖“恢复全部账户”确认框里的账户差异 / 数据规模变化接线，以及“撤销上次导入”在账户管理界面的入口与回滚确认流，避免这类高风险交互只剩纯函数测试
- safety(import): “恢复全部账户”确认框新增数据规模变化摘要，直接展示恢复前后账户 / 事件 / 对账 / 账本 / 覆盖记录的净增减，帮助用户在确认前快速识别“这份备份会让我少什么、多什么”
- test(import-preview): 新增数据规模变化摘要回归测试，覆盖账户/事件/对账/账本/覆盖记录的增减计算，避免恢复确认框展示与真实恢复结果脱节
- safety(import): “恢复全部账户”确认框新增账户差异速览，直接展示恢复后会新增 / 移除 / 保留的账户名，避免用户只看到抽象高风险提示却看不出具体会丢哪些本地账户
- test(import-preview): 新增账户差异摘要回归测试，覆盖新增 / 移除 / 保留三类账户名，以及空名 / 重复名去噪，防止恢复确认框被脏数据误导
- test(event-form): 新增 `EventFormModal` 组件级交互测试，真实覆盖频率切换后的字段显隐、规则预演显示/隐藏、字段旁即时错误提示，以及非法提交时的阻断行为，避免纯函数通过但界面接线回归
- fix(event-form): 事件表单的默认日期与频率切换补默认值改为统一使用 store 里的业务 today（含模拟日期），避免“表单默认今天 / 预演锚点 / 时间线今天”三套时间语义漂移
- chore(test): 引入 `@vue/test-utils`，为后续本地 Vue 组件级交互回归测试提供基础能力
- ux(event-form): 起始日期 / 结束日期 / 一次性发生日期现在会在字段旁即时显示越界错误，而不是只在提交时弹 toast，减少事件规则填写时的来回试错
- test(event-form): 新增事件表单日期反馈回归测试，覆盖起止日期倒挂与一次性日期超出结束日期两类即时错误提示
- feat(event-navigation): 事件清单里的“查看图上日期”现在支持在同一规则的多个发生日期之间前后切换；定位横幅会显示当前是第几次发生，并提供“上一个日期 / 下一个日期”按钮，避免高频事件只能跳到一次后还要手动拖图继续找
- test(event-focus): 扩展事件定位纯函数测试，覆盖多次发生日期的索引、前后可切换状态，以及 step 切换回归
- fix(build): 删除误导 Vite 实际构建的历史编译产物 `vite.config.js`，收口到源码配置 `vite.config.ts`，修复“代码已拆包但生产构建仍回退到旧 manualChunks 策略”的配置漂移问题
- perf(build): 继续细化 Vite `manualChunks`，把原先单一的 `vendor-antd` 大包拆成 `vendor-antd-core / vendor-antd-form / vendor-antd-feedback / vendor-antd-icons`，并把 `markdown-it`、日期库单独分仓，降低首屏被低频弹窗 UI 依赖绑住的概率
- perf(charts): 将共享图表纯函数从单一 `chart-options.ts` 继续拆成 `chart-base.ts + chart-options-cashflow.ts + chart-options.ts(余额图)`，让月度收支图不再跟余额图焦点/tooltip/markLine 逻辑打进同一异步块
- perf(build): 生产构建告警从旧的 `vendor-antd ~718kB` / `chart-options ~483kB` 收敛为多个更小的按需 chunk；当前构建结果中 `vendor-antd-core ~397.8kB`、`vendor-antd-form ~195.4kB`、`vendor-antd-feedback ~91.2kB`、`vendor-markdown ~91.9kB`、`vendor-date ~43.5kB`、余额图异步块约 `67.5kB`、收支图异步块约 `39.5kB`，已消除默认 500kB 告警
- perf(charts): 继续细化图表按需加载，Vite 现在会把 `src/utils/echarts-balance.ts` 与 `src/utils/echarts-cashflow.ts` 强制拆成独立 runtime chunk，避免 Rollup 因共享 ECharts 依赖再次把两张图揉回同一个大 `chart-base` 共享块；本轮构建里 `chart-base` 已从约 `471.84kB` 收敛到约 `4.28kB`，余额图 / 收支图依赖链解耦更彻底
- feat(import): 导入当前账户 / 恢复全部账户前会自动保存一份浏览器内回滚快照，账户管理面板新增“撤销上次导入/恢复”，误恢复后可一键回退到操作前本地状态
- safety(import): 回滚快照仅在备份文件解析成功后才写入，避免坏文件误覆盖可撤销点；新增存储层与 store 回归测试覆盖回滚保存/撤销链路
- feat(chart-events): 支持从余额图直接点击含事件的数据点，自动打开事件抽屉并高亮对应规则事件
- feat(event-panel): 增加事件定位横幅、首条高亮项自动滚动、清除定位入口，降低图表与事件列表之间来回切换成本
- test: 新增 `event-focus` 纯函数测试，覆盖图表日期到规则事件映射与空事件日期保护

## 2026-03-08

- 优化：本地持久化改为“首写立即落盘 + 短窗口合并后续写入 + 相同状态跳过重复写入”，减少高频编辑、导入和批量操作时对 `localStorage` 的反复全量序列化与写入压力。
- 稳定性：仓储层新增 `beforeunload/pagehide` 自动 flush，以及显式 `flushPendingSave()`；`恢复全部账户` / `导入当前账户` 等关键路径现在会强制落盘，避免“操作刚完成但立即读取持久化内容为空/未更新”的竞态。
- 修复：图表区新增空数据态提示，避免首次进入或无对账/无现金流数据时只看到空白图表容器。
- 优化：抽离 `chart-options` 纯函数，统一管理余额图 / 月度收支图的 ECharts option 构建，降低组件体积并补齐可测试性。
- 性能/体验：长时间线图表现在会自适应稀疏 x 轴标签，并在超长数据量时关闭动画，减少标签拥挤与大视窗滚动时的无效动画开销。
- 测试：新增图表 option 回归测试，覆盖空时间线、长时间线标签策略、动画降级、默认聚焦时间窗与月度收支序列映射。
- 体验：余额图新增“快速定位”快捷入口，可一键跳到最新区间、今天、首次预警、最低点、最近对账，降低长时间线手工拖拽成本。
- 体验：余额图 dataZoom 默认会围绕关键日期自动聚焦，优先首个预警日，其次今天/最近对账，进入页面即可看到更相关的时间窗。
- 测试：新增本地存储回归测试，覆盖“连续保存合并”“离开页面前 flush”“相同状态不重复写入”。
- 修复：`导入当前账户` 现在会为导入的事件、快照、对账、账本条目、事件覆盖重新生成本地唯一 ID，并同步重建 `ruleId` / `reconciliationId` 引用关系，避免与现有账户数据发生隐性 ID 冲突。
- 测试：新增导入链路回归测试，覆盖“当前账户导入后内部引用关系仍然正确”的场景。
## 2026-03-09
- 图表体验：余额图在“最新区间 / 今天 / 首次预警 / 最低点 / 最高点 / 最近对账”快速定位后，新增焦点解释卡，直接说明该位置的重要原因、与预警线的距离，以及当天关键事件摘要，减少用户在图表和事件列表之间来回比对。
- feat(event-form): 事件表单新增重复日期语义即时提示；当用户为每月/季度/半年事件填写 29-31 日时，会提前说明短月将自动落在月末；为每年事件填写 2/29 时，会提示平年自动按 2/28 执行
- ux(event-form): 每年事件的月份/日期组合若本身无效（如 4 月 31 日），现在会在字段旁即时显示错误提示，而不是等到提交后才弹全局报错
- test: 为事件表单新增语义提示回归测试，覆盖 monthly 31 日月末降级、yearly 2/29 平年降级，以及无效月日组合错误文案
- feat(event-form): 事件表单新增“接下来会这样发生”规则预演区块，用户在提交前就能看到最近几次真实发生日期，而不是只读抽象频率规则
- ux(event-form): monthly 31 日会在预演里直接展示短月实际落点（如 2/28），yearly 2/29 会明确展示平年回退到 2/28，降低日期语义理解门槛
- test(event-form): 扩展 event-form 回归测试，覆盖 monthly 31 日预演、yearly 2/29 平年回退，以及 disabled / invalid 规则不展示预演

- ux(account-danger): 清空账户数据确认框现在会展示真实删除范围摘要（事件/对账/账本/覆盖记录数量、余额归零、仅影响当前账户），不再沿用过时的“事件和快照”描述，降低本地危险操作误判风险
- test(account-danger): 扩展 AppHeader 组件级回归，覆盖清空当前账户的真实摘要展示、错误确认拦截，以及确认后事件/对账/账本/覆盖记录与余额的实际重置
