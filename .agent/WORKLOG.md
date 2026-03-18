# WORKLOG（可审阅的工作日志）

> 只记录"可验证的改动/结论/取舍"。不要写入敏感信息。

## 2026-03-18
- 2026-03-18 19:47–19:49（Asia/Shanghai）交付：为 `defaults.ts` 工具模块补齐单测覆盖。
  - 变更：新增 `src/utils/__tests__/defaults.test.ts`，覆盖 16 个用例：
    - APP_VERSION semver 格式验证
    - ACCOUNT_COLORS 颜色数组（7 个有效 hex）
    - ACCOUNT_ICONS 图标 key 数组（7 个非空字符串）
    - DEFAULT_ACCOUNT_CONFIG 必填字段、唯一 ID、ISO 时间戳
    - DEFAULT_SNAPSHOT 初始快照、accountId 关联、valid date
    - DEFAULT_PREFERENCES 默认视图配置
    - DEFAULT_RECONCILIATION 初始对账、唯一 ID
    - COLOR_PALETTE 收入/支出/警告/中性颜色 valid hex
  - 验收：`npm test` ✅（50 files / 422 tests passed）；`npm run type-check` ✅；`npm run build` ✅。
  - 验证命令：`npm test && npm run type-check && npm run build`

- 2026-03-18 19:11–19:13（Asia/Shanghai）交付：为 `analytics.ts` 工具模块补齐单测覆盖。
  - 变更：新增 `src/utils/__tests__/analytics.test.ts`，覆盖 8 个用例：
    - 空 timeline 返回默认值
    - 单日 timeline 处理
    - 多月收入/支出/净额聚合
    - 最低/最高余额及日期追踪
    - 余额低于阈值时的 warningDates 收集
    - 负净额与 fallback 行为
  - 验收：`npm test` ✅（49 files / 406 tests passed）；`npm run type-check` ✅；`npm run build` ✅。
  - 提交：`7c673b1 test(utils): add unit tests for AnalyticsEngine module`
  - 验证命令：`npm test && npm run type-check && npm run build`

- 2026-03-18 18:34–18:36（Asia/Shanghai）交付：为 `export-events.ts` 工具模块补齐单测覆盖。
  - 变更：新增 `src/utils/__tests__/export-events.test.ts`，覆盖 17 个用例：
    - `buildEventsCsv` 测试 CSV 头部生成、账户名称映射、收入/支出分类、每月/一次性周期处理、禁用事件、特殊字符转义（逗号/引号/换行）
    - `buildEventsJson` 测试 exportedAt 时间戳、事件计数、JSON 格式化、空数组处理
  - 验收：`npm test` ✅（48 files / 398 tests passed）；`npm run type-check` ✅；`npm run build` ✅。
  - 验证命令：`npm test && npm run type-check && npm run build`

- 2026-03-18 17:59–18:02（Asia/Shanghai）交付：为 `id.ts` 和 `color.ts` 工具模块补齐单测覆盖。
  - 变更：新增 `src/utils/__tests__/id.test.ts`（3 个用例：非空字符串、唯一性、crypto.randomUUID 使用）和 `src/utils/__tests__/color.ts`（8 个用例：sanitizeHexColor 边界情况）
  - 验收：`npm test` ✅（47 files / 381 tests passed）；`npm run type-check` ✅；`npm run build` ✅。
  - 验证命令：`npm test && npm run type-check && npm run build`

- 2026-03-18 16:49–16:52（Asia/Shanghai）交付：为 `reconciliation.ts` 工具模块补齐单测覆盖。
  - 变更：新增 `src/utils/__tests__/reconciliation.test.ts`，覆盖 21 个用例：
    - `computePeriodKey` 测试 once/monthly/quarterly/semi-annual/yearly 的周期键生成
    - `ReconciliationEngine.generatePendingEntries` 测试日期范围过滤、规则激活状态、重复周期匹配
    - `ReconciliationEngine.createReconciliation` 测试余额计算、差额调整生成
    - `ReconciliationEngine.recalculateAdjustment` 测试调整条目重算
  - 验收：`npm test` ✅（45 files / 370 tests passed）；`npm run type-check` ✅；`npm run build` ✅。
  - 提交：`27f8f63 test(utils): add unit tests for reconciliation module`
  - 验证命令：`npm test && npm run type-check && npm run build`

## 2026-03-16
- 引入 `.agent/` 协同开发区：把任务/进展/决策放进仓库，便于你和其它 AI 参与协作
- 验收主线已包含 AI 分析 empty_stream 自动恢复：前端在首包前断流时自动重试，并支持降级恢复与诊断复制；相关验证命令：`npm test`、`npm run type-check`、`npm run build`
- 验收命令结果：全部通过。已确认覆盖 AI 分析恢复测试、清空会话刷新不回归测试，以及现金流事件日期布局相关测试；提交并推送：`574dd44 chore: record ai recovery verification`；远端确认命令：`git log -1 --oneline` -> `574dd44 chore: record ai recovery verification`
- 复核当前 `main`：P0-1/P0-2/P1 相关代码、测试与 README 验收路径均已在分支上。2026-03-16 17:14-17:16（Asia/Shanghai）再次执行 `npm test`、`npm run type-check`、`npm run build` 全部通过；当前 HEAD=`a5b8964 test(smoke): add minimal reconciliation journey + README path`。验证点：`src/utils/__tests__/ai-stream.test.ts` 覆盖 empty_stream 自动重试/降级/诊断，`src/components/ai/__tests__/AiAnalysisModal.test.ts` 覆盖前端无重复输出与可恢复提示，`src/stores/__tests__/finance-smoke.test.ts` 覆盖清空会话刷新不回流，`src/components/charts/__tests__/UpcomingEvents.test.ts` 覆盖事件日期列表布局。
- 2026-03-16 20:14-20:16（Asia/Shanghai）再次按提交纪律复核：`npm test`（39 files / 272 tests passed）、`npm run type-check`、`npm run build` 全通过；当前 `origin/main` 与本地 `main` 同步，验证提交：`892a1cd chore(build): make build:verify portable without tee`。本次未发现 P0-1 empty_stream 自动恢复、P0-2 清空会话刷新、P1 "查看图上日期" 布局的回归；远端确认命令：`git log -1 --oneline`、`git rev-parse HEAD && git rev-parse origin/main`。
- 2026-03-16 22:13-22:16（Asia/Shanghai）future-money autonomous worker 复核：再次执行 `npm test`、`npm run type-check`、`npm run build` 全通过；核对 `src/utils/ai.ts`、`src/components/ai/AiAnalysisModal.vue`、`src/utils/__tests__/ai-stream.test.ts`、`src/components/ai/__tests__/AiAnalysisModal.test.ts`、`src/components/events/EventCard.vue`，确认 P0-1 已实现 empty_stream 首包前自动重试（300ms/800ms）+ 单次降级补拉（当前实现为备用模型 `gpt-5.2` + `stream=false`）、保留 scope 锁定与草稿、输出诊断 provider/model/traceId/httpStatus/retries、成功时无重复输出；P0-2 清空会话刷新不回归；P1 "查看图上日期" 已通过 `word-break`/`overflow-wrap`/`min-width: 0` 避免撑爆布局。对应审计提交：待本条提交后补记；远端确认命令：`git log -1 --oneline`。
- 2026-03-16 23:21-23:23（Asia/Shanghai）固化 CI 稳定性：CI 使用 `actions/setup-node@v4` 的 `node-version-file: .node-version` 对齐本地/线上 Node 版本；显式设置 `cache-dependency-path: package-lock.json` 提升 npm cache 命中确定性；安装步骤使用 `npm ci --prefer-offline --no-audit`（锁文件严格 + 更友好缓存命中）。本地验收：`npm run smoke`、`npm run build:verify` 全通过。

## 2026-03-17
- 2026-03-17 16:55-17:03（Asia/Shanghai）交付一个可验收的小改进：消除 `EventPanel` 单测中因未 stub Ant Design Vue dropdown/menu 导致的 Vue warn 噪音。
  - 变更：`src/components/events/__tests__/EventPanel.test.ts` 补齐 `a-dropdown` / `a-menu` / `a-menu-item` stub，并在 `mountPanel()` 的 `global.stubs` 中注册。
  - 效果：测试输出不再出现 `Failed to resolve component: a-menu-item/a-menu/a-dropdown` 警告，便于 CI/本地定位真正异常。
  - 验收：`npm test` ✅（41 files / 289 tests passed）；`npm run type-check` ✅；`npm run build` ✅。

- 2026-03-17 16:06-16:07（Asia/Shanghai）交付：加固 `isValidISODate` 的时区安全性。
  - 变更：`src/utils/validators.ts` 改为使用 `date-fns/format(parsed, 'yyyy-MM-dd') === value` 进行 round-trip 比对，避免 `toISOString()` 在时区边界导致日期偏移；保留正则约束仅允许 `YYYY-MM-DD`。
  - 测试：`src/utils/__tests__/validators.test.ts` 新增用例，明确拒绝带时间的字符串（例如 `2025-02-28T00:00:00Z`），避免误把 datetime 当 date。
  - 验收：`npm test` ✅（41 files / 289 tests passed）。

- scripts/check-build-log.mjs：增强 Vite oversize 解析与提示（支持 Windows 路径分隔符、可选 map 列、可通过 `VITE_CHUNK_SIZE_WARNING_LIMIT_KB` 覆盖 500kB 阈值；并在"有 generic warning 但没有 chunk 超阈值"时给出明确提示）。新增配套单测覆盖上述边界条件。提交：`01fdb6f chore(build): harden check-build-log parsing (windows paths, map, configurable limit)`
- 验收命令与结果：
  - `npm test` ✅（40 files / 280 tests passed）
  - `npm run type-check` ✅
  - `npm run build` ✅

- 补齐环境变量/开关文档：新增 `docs/ENV.md`（CI/构建校验开关 + AI 配置说明），新增 `.env.example`（仅占位符），并在 README 增加"环境变量快速开始"入口链接。
- 验收命令与结果：
  - `npm test` ✅（39 files / 272 tests passed）
  - `npm run type-check` ✅
  - `npm run build` ✅（Vite 正常提示 `vendor-antd` > 500kB 属于 warning；严格失败可用 `CI_STRICT_VITE_OVERSIZE=1`）
- 2026-03-17 07:14-07:15（Asia/Shanghai）按最新 autonomous dev worker 指令再次执行完整验收复跑：
  - `npm test` 通过（39 files / 272 tests）
  - `npm run type-check` 通过
  - `npm run build` 通过
  - 再次复核实现位置：`src/utils/ai.ts`、`src/components/ai/AiAnalysisModal.vue`、`src/utils/__tests__/ai-stream.test.ts`、`src/components/ai/__tests__/AiAnalysisModal.test.ts`、`src/stores/__tests__/finance-smoke.test.ts`、`src/components/events/EventCard.vue`
  - 结论：P0-1 当前 `main` 已覆盖 `empty_stream` 首包前自动重试（300ms / 800ms）+ 重试耗尽后的单次降级补拉（当前实现为同通道备用模型 `gpt-5.2` 且 `stream=false`），并输出可复制诊断 `provider/model/traceId/httpStatus/retries`，重试成功时不会残留旧 buffer 或重复 assistant 输出；P0-2 清空会话刷新不回流；P1 "查看图上日期" 仍通过换行/断词约束避免撑爆布局。
  - 验证命令：`npm test`、`npm run type-check`、`npm run build`、`git status --short --branch`、`git rev-parse HEAD && git rev-parse origin/main`、`git log -1 --oneline`

- 为 `scripts/check-build-log.mjs` 增加脚本级单测：新增 `scripts/__tests__/check-build-log.test.ts` 覆盖：
  - 正常完整日志通过
  - `Circular chunk:` 警告直接失败
  - Vite oversize 仅警告列出 chunk 列表（默认不失败）
  - `CI=1` + `CI_STRICT_VITE_OVERSIZE=1` 时 oversize 升级为失败
  - 缺失 `built in` 完成标记时失败
- 验收命令与结果：
  - `npm test` ✅（40 files / 277 tests passed）
  - `npm run type-check` ✅
  - `npm run build` ✅（Vite chunk > 500kB 警告存在；如需严格失败可用 `CI_STRICT_VITE_OVERSIZE=1`）
  - `npm run smoke` ✅（3 files / 8 tests passed；并生成 `tmp-browser-chart-smoke/*` 产物）

- 为"错误可诊断（最小复现模板）"补齐 GitHub Issue 模板：新增 `.github/ISSUE_TEMPLATE/bug_report.yml`，引导提交者提供 **最小复现步骤** + **诊断信息**（浏览器/系统、Console/Network、AI 场景下的 provider/model/http status/traceId），并提醒导出的 JSON 快照需脱敏。
- README 在「贡献」处补充指引：报告 Bug 使用 Bug report 模板，按诊断字段填写，降低来回追问成本。
- 验收命令：`npm test`（39 files / 272 tests passed）。
- 2026-03-17 02:14-02:16（Asia/Shanghai）future-money autonomous worker 再次复核 P0-1/P0-2/P1：
  - `npm test` 通过（39 files / 272 tests）
  - `npm run type-check` 通过
  - `npm run build` 通过
  - 复核实现位置：`src/utils/ai.ts`、`src/components/ai/AiAnalysisModal.vue`、`src/utils/__tests__/ai-stream.test.ts`、`src/components/ai/__tests__/AiAnalysisModal.test.ts`、`src/stores/__tests__/finance-smoke.test.ts`、`src/components/events/EventCard.vue`
  - 结论：P0-1 已包含 empty_stream 首包前自动重试（300ms/800ms）+ 降级恢复（当前实现为优先备用模型 `gpt-5.2` 且使用 `stream=false` 拉全量结果）+ 诊断信息 provider/model/traceId/httpStatus/retries + 成功时清空旧 buffer 避免重复输出；P0-2 清空会话刷新不回归；P1 "查看图上日期" 已通过换行/断词约束避免撑爆布局。
  - 远端确认命令：`git log -1 --oneline`、`git rev-parse HEAD && git rev-parse origin/main`。
- 2026-03-17 03:14-03:16（Asia/Shanghai）按 autonomous worker 提交纪律再次执行验收复跑并审源码：
  - `npm test` 通过（39 files / 272 tests）
  - `npm run type-check` 通过
  - `npm run build` 通过
  - 审核代码位置：`src/utils/ai.ts` 中 `streamChatWithRecovery()` 仍包含 empty_stream 指数退避自动重试（300ms / 800ms）与重试耗尽后 `gpt-5.4 -> gpt-5.2` 且 `stream=false` 的单次降级补拉；`src/components/ai/AiAnalysisModal.vue` 仍在成功恢复时复用新结果覆盖 buffer、失败时展示 provider/model/traceId/httpStatus/retries 可复制诊断，并保留 scope 锁定与草稿；`src/stores/__tests__/finance-smoke.test.ts` 仍覆盖清空/删除后的刷新不回流；`src/components/events/EventCard.vue` 仍通过 `min-width: 0` + `overflow-wrap:anywhere` 约束"查看图上日期"按钮不撑爆布局。
  - 结论：当前 `main`/`origin/main` 的可验收版本已经满足本轮 P0-1 / P0-2 / P1 要求，本次无功能代码变更，仅补充审计日志并按纪律推送。
- 2026-03-17 04:14-04:17（Asia/Shanghai）再次按本轮 autonomous worker 指令现网复核并执行完整验收：
  - `npm test` 通过（39 files / 272 tests）
  - `npm run type-check` 通过
  - `npm run build` 通过
  - 复核点：`src/utils/ai.ts` 仍实现 `empty_stream` 首包前自动重试（300ms / 800ms）+ 重试耗尽后单次降级补拉（当前为 `gpt-5.4 -> gpt-5.2` 且 `stream=false`）；`src/components/ai/AiAnalysisModal.vue` 仍在成功恢复时避免重复输出、失败时展示可复制诊断 `provider/model/traceId/httpStatus/retries`，并保持草稿与账户 scope 锁定；`src/stores/__tests__/finance-smoke.test.ts` 仍覆盖清空会话刷新不回流；`src/components/events/EventCard.vue` 仍通过断词/换行约束修复"查看图上日期"撑爆布局。
  - 远端状态：复核前 `HEAD == origin/main == af10e13`，说明相关改动已在远端主分支可见；本次提交仅追加审计日志。
  - 验证命令：`npm test`、`npm run type-check`、`npm run build`、`git rev-parse HEAD && git rev-parse origin/main`、`git log -1 --oneline`
- 2026-03-17 05:14-05:17（Asia/Shanghai）按最新 autonomous worker 指令再次执行完整验收复跑：
  - `npm test` 通过（39 files / 272 tests）
  - `npm run type-check` 通过
  - `npm run build` 通过
  - 再次审计实现：`src/utils/ai.ts` 的 `streamChatWithRecovery()` 仍覆盖 `empty_stream` 首包前自动重试（300ms / 800ms）与重试耗尽后的单次降级补拉（当前实现为同通道备用模型 `gpt-5.2` 且 `stream=false`）；`src/components/ai/AiAnalysisModal.vue` 仍在重试成功时重建输出避免重复内容、失败时展示并支持复制 `provider/model/traceId/httpStatus/retries` 诊断信息，同时保留草稿与 scope 锁定；`src/stores/__tests__/finance-smoke.test.ts` 仍覆盖清空会话刷新不回流；`src/components/events/EventCard.vue` 仍通过 `min-width: 0`、`white-space: normal`、`overflow-wrap: anywhere` 防止"查看图上日期"按钮撑爆布局。
  - 当前远端基线：复跑前 `HEAD == origin/main == 4a34176`；本次仅补充新的可审计验收记录并立即推送。
  - 验证命令：`npm test`、`npm run type-check`、`npm run build`、`git log -1 --oneline`、`git rev-parse HEAD && git rev-parse origin/main`
- 2026-03-17 06:13-06:16（Asia/Shanghai）按本轮 autonomous dev worker 指令再次执行完整验收并复核远端：
  - `npm test` 通过（39 files / 272 tests）
  - `npm run type-check` 通过
  - `npm run build` 通过
  - 针对 P0-1：复核 `src/utils/ai.ts` 与 `src/components/ai/AiAnalysisModal.vue`，确认 `empty_stream` 首包前断开时会自动重试 2 次（300ms / 800ms 指数退避），重试耗尽后走单次降级补拉（当前实现为同通道备用模型 `gpt-5.2` 且 `stream=false`），并在失败横幅中输出可复制诊断 `provider/model/traceId/httpStatus/retries`；重试成功时不会遗留旧 buffer 或重复 assistant 输出。
  - 针对 P0-2：复核 `src/stores/__tests__/finance-smoke.test.ts` 与 `src/components/ai/__tests__/AiAnalysisModal.test.ts`，确认清空当前 scope 对话/草稿后刷新不回流，scope 切换也不会串台。
  - 针对 P1：复核 `src/components/events/EventCard.vue` 与 `src/components/events/__tests__/EventCard.test.ts`，确认"查看图上日期"按钮在窄宽度下允许换行/断词，不再把事件卡片撑爆布局。
  - 远端状态：复核前 `HEAD == origin/main == bcd834d`；本次提交仅追加可审计 WORKLOG，并立即 push 到 `origin/main`。
  - 验证命令：`npm test`、`npm run type-check`、`npm run build`、`git status --short --branch`、`git rev-parse HEAD && git rev-parse origin/main`、`git log -1 --oneline`
- 2026-03-17 08:14-08:16（Asia/Shanghai）按最新 future-money autonomous dev worker 指令复核 P0-1 / P0-2 / P1 并执行强制验收：
  - `npm test` 通过（40 files / 277 tests）
  - `npm run type-check` 通过
  - `npm run build` 通过
  - P0-1 复核：`src/utils/ai.ts` 的 `streamChatWithRecovery()` 仍对 `empty_stream` 执行首包前自动重试（300ms / 800ms），重试耗尽后走单次降级补拉（当前实现为 `gpt-5.4 -> gpt-5.2` 且 `stream=false`）；`src/components/ai/AiAnalysisModal.vue` 仍保留草稿与 scope 锁定，失败横幅可复制 `provider/model/traceId/httpStatus/retries`，且恢复成功时会直接用新结果覆盖 buffer，避免重复 assistant 输出。
  - P0-1 测试复核：`src/utils/__tests__/ai-stream.test.ts` 覆盖 `empty_stream -> 自动重试 -> 成功` 与 `empty_stream -> 重试耗尽 -> 降级/失败诊断`；`src/components/ai/__tests__/AiAnalysisModal.test.ts` 覆盖前端"自动重试成功时无感且无重复输出"与"重试耗尽后展示可恢复提示 + 诊断信息"。
  - P0-2 复核：`src/stores/__tests__/finance-smoke.test.ts` 仍覆盖清空当前账户/删除账户后的 AI 会话与草稿持久化清理，刷新后不会回流到当前或剩余账户。
  - P1 复核：`src/components/events/EventCard.vue` 仍通过 `min-width: 0`、`white-space: normal`、`word-break: break-word`、`overflow-wrap: anywhere` 约束"查看图上日期"按钮；`src/components/events/__tests__/EventCard.test.ts` 仍锁定窄屏长文案场景。
  - 远端状态：复核前 `HEAD == origin/main == 3041391`；本次提交仅追加可审计 WORKLOG，并立即 push 到 `origin/main`。
  - 验证命令：`npm test`、`npm run type-check`、`npm run build`、`git status --short --branch`、`git log -1 --oneline`、`git rev-parse HEAD && git rev-parse origin/main`

- 2026-03-17 08:50-08:52（Asia/Shanghai）交付一个可验收的小改进：增强 `scripts/check-build-log.mjs` 对 Vite 资产输出格式的兼容性（更稳定地提取 oversize chunk 列表），并补充单测覆盖边界：
  - 支持 `│`/`|` 分隔符
  - 支持缺失 `gzip:` 列（仍输出 oversize 列表）
  - 若检测到 oversize warning 但无法解析出任何 `dist/assets` 行：会明确告警；在 `CI_STRICT_VITE_OVERSIZE=1` 时直接失败，避免 CI 静默放过
  - 验收：`npm test` ✅（40 files / 278 tests passed）、`npm run type-check` ✅、`npm run build` ✅
- 2026-03-17 09:14-09:16（Asia/Shanghai）按最新 future-money autonomous dev worker 指令再次执行 P0-1 / P0-2 / P1 强制验收并复核源码实现：
  - `npm test` 通过（40 files / 278 tests）
  - `npm run type-check` 通过
  - `npm run build` 通过
  - P0-1 复核：`src/utils/ai.ts` 的 `streamChatWithRecovery()` 仍对 `empty_stream` 执行首包前自动重试 2 次（300ms / 800ms 指数退避），重试耗尽后执行单次降级补拉（当前实现为 `gpt-5.4 -> gpt-5.2` 且 `stream=false`）；`src/components/ai/AiAnalysisModal.vue` 仍在重试期间保留草稿与 scope 锁定，成功恢复时以新结果覆盖 buffer 避免重复输出，失败时展示并支持复制 `provider/model/traceId/httpStatus/retries` 诊断信息。
  - P0-1 测试复核：`src/utils/__tests__/ai-stream.test.ts` 继续覆盖 `empty_stream -> 自动重试 -> 成功`、`empty_stream -> 重试耗尽 -> 降级补拉成功` 与 `empty_stream -> 重试/降级均失败 -> 展示诊断`；`src/components/ai/__tests__/AiAnalysisModal.test.ts` 继续覆盖"自动重试成功时用户无感且无重复输出"与"重试耗尽后展示可恢复提示 + 可复制诊断"。
  - P0-2 复核：`src/stores/__tests__/finance-smoke.test.ts` 仍覆盖清空当前 scope 会话/草稿后刷新不回流，说明"清空会话刷新仍存在"未回归。
  - P1 复核：`src/components/events/EventCard.vue` 仍通过 `min-width: 0`、`white-space: normal`、`word-break: break-word`、`overflow-wrap: anywhere` 约束"查看图上日期"按钮，`src/components/events/__tests__/EventCard.test.ts` 仍锁定窄宽度布局场景。
  - 提交纪律：本次复核前工作区干净；本条审计记录提交后立即 push 到 `origin/main`，并用 `git log -1 --oneline` 与 `git rev-parse HEAD && git rev-parse origin/main` 复核远端可见。
  - 验证命令：`npm test`、`npm run type-check`、`npm run build`、`git status --short --branch`、`git log -1 --oneline`、`git rev-parse HEAD && git rev-parse origin/main`
- 2026-03-17 10:16-10:18（Asia/Shanghai）按 future-money autonomous dev worker 最新指令再次执行现网前验收复核：
  - `npm test` 通过（40 files / 280 tests）
  - `npm run type-check` 通过
  - `npm run build` 通过
  - P0-1 复核：`src/utils/ai.ts` 的 `streamChatWithRecovery()` 仍在 `empty_stream` 且首包前断流时自动重试 2 次（300ms / 800ms 指数退避），重试耗尽后执行单次降级补拉（当前实现为 `gpt-5.4 -> gpt-5.2` 且 `stream=false`）；`src/components/ai/AiAnalysisModal.vue` 仍保留草稿与 scope 锁定，重试成功时清空旧 buffer 避免重复输出，重试/降级均失败时展示并支持复制 `provider/model/traceId/httpStatus/retries` 诊断信息与"已降级模型重试"提示。
  - P0-1 测试复核：`src/utils/__tests__/ai-stream.test.ts` 覆盖 `empty_stream -> 自动重试 -> 成功`、`empty_stream -> 重试耗尽 -> 降级补拉成功`、`empty_stream -> 重试/降级均失败 -> 诊断信息`；`src/components/ai/__tests__/AiAnalysisModal.test.ts` 覆盖"自动重试成功时用户无感且无重复输出"与"重试耗尽后展示可恢复提示 + 可复制诊断"。
  - P0-2 复核：`src/stores/__tests__/finance-smoke.test.ts` 仍覆盖清空当前 scope 会话/草稿后刷新不回流；删除账户时相关 AI 持久化也会一并清理。
  - P1 复核：`src/components/events/EventCard.vue` 仍通过 `min-width: 0`、`white-space: normal`、`word-break: break-word`、`overflow-wrap: anywhere` 约束"查看图上日期"按钮，避免窄宽度下撑爆布局。
  - 远端确认命令：`git log -1 --oneline`、`git rev-parse HEAD && git rev-parse origin/main`。

- 交付：为 `scripts/check-build-chunks.mjs` 增加脚本级单测（与 `check-build-log` 形式一致），覆盖：
  - 正常 dist/assets + baseline 情况通过
  - dist/assets 缺失时失败并给出清晰提示
  - baseline 缺失时失败并给出清晰提示
  - requiredChunks 缺失时报错
  - `CI=1` + `CI_STRICT_BUILD_BUDGET=1` 时 warnings 升级为失败
  - 非 strict 下 warnings 输出但不失败
- 验收命令与结果：
  - `npm test` ✅（41 files / 286 tests passed）
  - `npm run type-check` ✅
- 2026-03-17 13:14-13:16（Asia/Shanghai）按最新 future-money autonomous dev worker 指令再次执行强制验收并复核主线需求：
  - `npm test` 通过（41 files / 286 tests）
  - `npm run type-check` 通过
  - `npm run build` 通过
  - P0-1 复核：`src/utils/ai.ts` 的 `streamChatWithRecovery()` 仍对首包前 `empty_stream` 执行自动重试 2 次（300ms / 800ms 指数退避），重试耗尽后执行单次降级补拉（当前实现为 `gpt-5.4 -> gpt-5.2` 且 `stream=false`）；`src/components/ai/AiAnalysisModal.vue` 仍在重试期间保留草稿与 scope 锁定，恢复成功时覆盖旧 buffer 避免重复输出，失败时展示并支持复制 `provider/model/traceId/httpStatus/retries` 诊断信息与"已降级模型重试"提示。
  - P0-1 测试复核：`src/utils/__tests__/ai-stream.test.ts` 覆盖 `empty_stream -> 自动重试 -> 成功`、`empty_stream -> 重试耗尽 -> 降级补拉成功`、`empty_stream -> 重试/降级均失败 -> 诊断信息`；`src/components/ai/__tests__/AiAnalysisModal.test.ts` 覆盖"自动重试成功时用户无感且无重复输出"与"重试耗尽后展示可恢复提示 + 可复制诊断"。
  - P0-2 复核：`src/stores/__tests__/finance-smoke.test.ts` 仍覆盖清空当前 scope 会话/草稿后刷新不回流；删除账户时关联 AI 持久化也会同步清理。
  - P1 复核：`src/components/events/EventCard.vue` 与 `src/components/events/__tests__/EventCard.test.ts` 仍锁定"查看图上日期"在窄宽度下可换行/断词，不再撑爆卡片布局。
  - 提交纪律：本次复核后立即提交并 push 到 `origin/main`；远端确认命令：`git log -1 --oneline`、`git rev-parse HEAD && git rev-parse origin/main`。

- 交付：增强 `scripts/check-build-chunks.mjs` 的 baseline 解析错误提示：当 `.meta/build-budget-baseline.json` 为非法 JSON 或不是 object 时，给出明确报错与修复提示，避免 Node 的 `JSON.parse` 原始异常造成定位困难。
  - 补充：进一步修正 baseline 类型校验（排除 array），并补齐脚本级单测覆盖「非法 JSON」与「非 object（array）」两类场景。
  - 验收：`npm test` ✅（41 files / 288 tests passed）、`npm run type-check` ✅
- 2026-03-17 15:14-15:16（Asia/Shanghai）按 latest autonomous dev worker 指令再次执行完整验收并复核 `origin/main`：
  - `npm test` 通过（41 files / 288 tests）
  - `npm run type-check` 通过
  - `npm run build` 通过
  - P0-1 复核：`src/utils/ai.ts` 的 `streamChatWithRecovery()` 仍对首包前 `empty_stream` 执行自动重试 2 次（300ms / 800ms 指数退避），重试耗尽后执行单次降级补拉；当前实现命中方案 B+A 的组合：优先切到同通道备用模型 `gpt-5.2`，并以 `stream=false` 拉取完整结果。`src/components/ai/AiAnalysisModal.vue` 仍在重试期间保留草稿与 scope 锁定，恢复成功时直接用最终结果覆盖 buffer，避免重复 assistant 输出；失败时展示并支持复制 `provider/model/traceId/httpStatus/retries` 诊断信息，并在模型降级时提示"已降级模型重试"。
  - P0-1 测试复核：`src/utils/__tests__/ai-stream.test.ts` 覆盖 `empty_stream -> 自动重试 -> 成功`、`empty_stream -> 重试耗尽 -> 降级补拉成功`、`empty_stream -> 重试/降级均失败 -> 诊断信息`；`src/components/ai/__tests__/AiAnalysisModal.test.ts` 覆盖"自动重试成功时用户无感且无重复输出"与"重试耗尽后展示可恢复提示 + 可复制诊断"。
  - P0-2 复核：`src/stores/__tests__/finance-smoke.test.ts` 仍覆盖清空当前 scope 会话/草稿后刷新不回流，确认"清空会话刷新仍存在"未回归。
  - P1 复核：`src/components/events/EventCard.vue` 与 `src/components/events/__tests__/EventCard.test.ts` 仍锁定"查看图上日期"按钮在窄宽度下可换行/断词，不再撑爆卡片布局。
  - 提交纪律：本次变更仅追加可审计 WORKLOG；提交后立即 `git push origin main`，并用 `git log -1 --oneline`、`git rev-parse HEAD && git rev-parse origin/main`、`git status --short` 确认远端可见且工作区干净。

- 2026-03-17 16:14-16:16（Asia/Shanghai）按最新 future-money autonomous dev worker 指令再次执行强制验收与远端复核：
  - `npm test` 通过（41 files / 289 tests）
  - `npm run type-check` 通过
  - `npm run build` 通过
  - P0-1 复核：`src/utils/ai.ts` 的 `streamChatWithRecovery()` 继续对首包前 `empty_stream` 做自动重试 2 次（300ms / 800ms 指数退避）；重试耗尽后执行单次降级补拉，当前实现为同通道 `gpt-5.4 -> gpt-5.2` 且 `stream=false`。`src/components/ai/AiAnalysisModal.vue` 继续在重试期间保留草稿与 scope 锁定，成功时覆盖旧 buffer 防止重复输出，失败时展示并支持复制 `provider/model/traceId/httpStatus/retries` 诊断信息。
  - P0-1 测试复核：`src/utils/__tests__/ai-stream.test.ts` 覆盖 `empty_stream -> 自动重试 -> 成功`、`empty_stream -> 重试耗尽 -> 降级补拉成功`、`empty_stream -> 重试/降级均失败 -> 诊断信息`；`src/components/ai/__tests__/AiAnalysisModal.test.ts` 覆盖"自动重试成功时用户无感且无重复输出"与"重试耗尽后展示可恢复提示 + 可复制诊断"。
  - P0-2 复核：`src/stores/__tests__/finance-smoke.test.ts` 继续覆盖清空当前 scope 会话/草稿后刷新不回流，确认未回归。
  - P1 复核：`src/components/events/EventCard.vue` 继续通过 `min-width: 0`、`white-space: normal`、`word-break: break-word`、`overflow-wrap: anywhere` 约束"查看图上日期"按钮，避免窄宽度下撑爆布局。
  - 远端状态：复核前 `HEAD == origin/main == f44ad60`；本次提交仅追加可审计 WORKLOG，并立即 push 到 `origin/main`。
  - 验证命令：`npm test`、`npm run type-check`、`npm run build`、`git status --short --branch`、`git log -1 --oneline`、`git rev-parse HEAD && git rev-parse origin/main`
- 2026-03-17 17:14-17:16（Asia/Shanghai）按本轮 future-money autonomous dev worker 指令再次执行完整验收并直接审源码，不重复依赖旧 WORKLOG 结论：
  - `npm test` 通过（41 files / 289 tests）
  - `npm run type-check` 通过
  - `npm run build` 通过（存在既有 Vite `vendor-antd` > 500kB warning，但构建成功）
  - P0-1 复核：`src/utils/ai.ts` 中 `streamChatWithRecovery()` 仍包含首包前 `empty_stream` 自动重试 2 次（300ms / 800ms），重试耗尽后触发单次降级补拉；当前实现为同通道 `gpt-5.4 -> gpt-5.2` 且 `stream=false`。`src/components/ai/AiAnalysisModal.vue` 仍保留草稿与 scope 锁定，失败横幅继续输出可复制诊断 `provider/model/traceId/httpStatus/retries`，自动恢复成功时会覆盖旧 buffer，避免重复 assistant 输出。
  - P0-1 测试复核：`src/utils/__tests__/ai-stream.test.ts` 继续覆盖 `empty_stream -> 自动重试 -> 成功`、`empty_stream -> 重试耗尽 -> 降级补拉成功`、`empty_stream -> 重试/降级均失败 -> 诊断信息`；`src/components/ai/__tests__/AiAnalysisModal.test.ts` 继续覆盖"自动重试成功时用户无感且无重复输出"与"重试耗尽后展示可恢复提示 + 可复制诊断"。
  - P0-2 复核：`src/stores/__tests__/finance-smoke.test.ts` 继续覆盖清空当前 scope 会话/草稿后刷新不回流，确认"清空会话刷新仍存在"未回归。
  - P1 复核：`src/components/events/EventCard.vue` 与 `src/components/events/__tests__/EventCard.test.ts` 继续锁定"查看图上日期"按钮在窄宽度下允许换行/断词，不再撑爆事件卡片布局。
  - 提交纪律：本次仅追加可审计 WORKLOG；提交后立即 `git push origin main`，再用 `git log -1 --oneline`、`git rev-parse HEAD && git rev-parse origin/main`、`git status --short --branch` 复核远端可见且工作区干净。

- 2026-03-17 17:25-17:26（Asia/Shanghai）修复：`validateCashFlowEvent` 在日期字符串非法时仍继续做 `YYYY-MM-DD` 字符串比较的问题。
  - 变更：`src/utils/validators.ts` 缓存 `hasValidStartDate/hasValidEndDate/hasValidOnceDate`，仅在相关日期均为合法 `YYYY-MM-DD` 时才执行 `endDate < startDate`、`onceDate < startDate`、`onceDate > endDate` 的字符串比较；避免非法日期触发"比较逻辑"造成误判/噪音。
  - 验收：`npm test` ✅（41 files / 289 tests passed）。

- 2026-03-17 18:17-18:20（Asia/Shanghai）修复：流式 reader 在首包前 read() 直接抛错时，将其归一化为可恢复的 `empty_stream`，以触发 `streamChatWithRecovery()` 的自动重试逻辑。
  - 变更：`src/utils/ai.ts` 在 `reader.read()` 的 try/catch 中，如果 `receivedFirstPayload === false` 且发生非 timeout/非 abort 的异常，则抛出 `AiRequestError`（status=500, code=empty_stream, retryable=true）并携带原始错误信息（归入 `empty_stream: <message>`）。
  - 测试：`src/utils/__tests__/ai-stream.test.ts` 新增用例覆盖「首包前 read() 直接 reject -> 归一化为 empty_stream -> 自动重试 -> 第二次成功返回内容」。
  - 兼容修正：`src/utils/validators.ts` 将 `startDate/endDate/onceDate` 先收窄到局部字符串变量，再做日期合法性与字典序比较，消除 `vue-tsc` 对 `event.startDate` / `event.endDate` 可能为 `undefined` 的报错；逻辑不变。
  - 验收：`npm test` ✅（41 files / 290 tests passed）、`npm run type-check` ✅、`npm run build` ✅。

- 2026-03-17 19:24-19:25（Asia/Shanghai）补充单测：当起始日期非法时，不应再执行 endDate < startDate 的字符串比较。
  - 背景：`validateCashFlowEvent` 仅在相关日期均为合法 `YYYY-MM-DD` 时才做字典序比较；该测试显式锁定该行为，避免未来重构回归。
  - 变更：`src/utils/__tests__/validators.test.ts` 新增用例：`startDate='2025-02-30'` 且 `endDate='2024-12-31'` 时只报"起始日期格式不正确"，不应同时报"结束日期不得早于起始日期"。
  - 验收：`npm test` ✅（41 files / 291 tests passed）。

- 2026-03-17 20:25-20:30（Asia/Shanghai）交付一个可验收的小改进：降低 `AiAnalysisModal` 单测的 stderr 噪音，并修复 `validateCashFlowEvent` 的 `vue-tsc` 可选属性告警。
  - 变更 1（测试降噪）：`src/components/ai/__tests__/AiAnalysisModal.test.ts` 在"请求失败并可重试"用例中临时 stub `console.error`，避免预期内的错误日志污染测试输出（其他用例仍保留显式断言 `console.error` 的行为）。

## 2026-03-18
- 交付：加固 AI proxy guard 对"IPv4 非标准写法"的拦截（安全防 SSRF/内网探测）。
  - 背景：Node/WHATWG URL 解析器会把一些看似不是 IPv4 dotted-quad 的 host 归一化成 IPv4（例如 `http://2130706433/`、`http://0x7f000001/`、`http://0177.0.0.1/` 会变成 `127.0.0.1`；而 `http://127/` 会变成 `0.0.0.127`）。如果 guard 只拦 127/10/192.168/172.16/169.254/100.64 等前缀，可能遗漏 0.0.0.0/8 这类"被归一化后出现"的回环/本机目标。
  - 变更：`src/utils/ai-proxy-guard.ts` 对 IPv4 literal 增加拦截：`0.0.0.0/8`（`startsWith('0.')`）以及 `255.255.255.255` broadcast。
  - 测试：`src/utils/__tests__/ai-proxy-guard.test.ts` 新增用例，明确拒绝 `http://127/`、`http://0.0.0.127/`、`http://0x7f000001/`、`http://2130706433/` 等输入。
  - 验收：`npm test` ✅（42 files / 301 tests passed）、`npm run type-check` ✅、`npm run build` ✅。
  - 验证命令：`npm test && npm run type-check && npm run build`。

  - 变更 2（类型安全）：`src/utils/validators.ts` 将 `startDate/endDate` 收窄为局部变量后再比较，避免 `event.startDate` 可能为 `undefined` 触发 `TS18048`；逻辑不变。
  - 验收：`npm test` ✅（41 files / 291 tests passed）；`npm run type-check` ✅；`npm run build` ✅。

- 2026-03-17 21:24-21:26（Asia/Shanghai）交付一个可验收的小改进：加固 AI API Base URL 规范化，避免 query/hash 泄漏并拒绝包含用户名/密码的 URL。
  - 变更：`src/utils/ai.ts` 的 `normalizeAiBaseUrl()` 现在会清空 `search/hash`，并在 URL 含 `username/password` 时直接报错（"API 地址不安全：不允许包含用户名或密码"）。
  - 测试：`src/utils/__tests__/ai-proxy-guard.test.ts` 新增用例覆盖 `?foo=bar#baz` 会被忽略、以及 `https://user:pass@...` 会被拒绝。
  - 验收：`npm test` ✅（41 files / 292 tests passed）；`npm run type-check` ✅；`npm run build` ✅。

- 2026-03-17 22:55-22:57（Asia/Shanghai）交付一个可验收的小改进：代理目标 URL 校验与前端 baseUrl 规范保持一致，进一步阻断 query/hash 与 URL credentials。
  - 背景：前端 `normalizeAiBaseUrl()` 已会 strip query/hash 并拒绝 `username/password`，但 dev server 的 `isAllowedAiProxyTargetUrl()` 之前只校验 protocol/hostname/path，可能接受带 query/hash 或 credentials 的 targetUrl。
  - 变更：`src/utils/ai-proxy-guard.ts` 的 `isAllowedAiProxyTargetUrl()` 现在额外拒绝：
    - URL 中包含 `username/password`（必须通过 `Authorization` header 提供认证）
    - URL 中包含 `search/hash`（避免意外泄漏、并保持 target 稳定）
  - 测试：`src/utils/__tests__/ai-proxy-guard.test.ts` 新增用例覆盖上述拒绝条件。
  - 验收：`npm test` ✅（41 files / 293 tests passed）；`npm run type-check` ✅。

- 2026-03-18 14:38-14:41（Asia/Shanghai）补齐 markdown 工具函数单测覆盖缺口。
  - 变更：为 `createCachedMarkdownRenderer` 新增 `clear()` 方法测试；为 `createStreamingMarkdownRenderer` 新增 `reset()` 方法测试、相同文本不重复渲染测试、中文标点触发刷新测试、反引号触发刷新测试。
  - 验收：`npm test` ✅（42 files / 313 tests passed）；`npm run type-check` ✅；`npm run build` ✅。

## 2026-03-18
- 2026-03-18 15:41-15:44（Asia/Shanghai）交付：为 `recurrence.ts` 工具函数补齐单测覆盖。
  - 背景：该模块包含事件日期激活判断 (`isEventActiveOnDate`) 与重复周期计算 (`shouldEventOccurOnDate`) 的核心逻辑（once/monthly/quarterly/semi-annual/yearly），此前缺少测试。
  - 变更：新增 `src/utils/__tests__/recurrence.test.ts`，覆盖 26 个用例，包括边界情况（月份天数 clamping、闰年 2 月 29 处理、季度/半年周期计算）。
  - 验收：`npm test` ✅（44 files / 349 tests passed）；`npm run type-check` ✅；`npm run build` ✅。

- 2026-03-18 15:06-15:08（Asia/Shanghai）交付：为 `escape-html` 工具函数补齐单测覆盖。
  - 背景：该工具函数是 XSS 防护的核心组件，此前缺少测试覆盖。
  - 变更：新增 `src/utils/__tests__/escape-html.test.ts`，覆盖 HTML 特殊字符转义（<, >, &, ", '）、空字符串、纯文本、换行与空格保留等边界场景。
  - 验收：`npm test` ✅（43 files / 323 tests passed）；`npm run type-check` ✅；`npm run build` ✅。
  - 提交：`245c727 test(utils): add escape-html unit tests`
  - 验证命令：`npm test && npm run type-check && npm run build`

- 2026-03-18 13:33-13:36（Asia/Shanghai）交付：修复 `clampMonthlyDay` 函数的 bug 并补齐测试覆盖。
  - 背景：`src/utils/date.ts` 中的 `clampMonthlyDay` 使用了错误的算法（`addMonths(date, 1)` 再 `-1 day`），导致永远返回 14 而非当月实际天数。
  - 修复：改用 `date-fns/endOfMonth` 正确获取月末天数。
  - 测试：新增 9 个用例覆盖 `clampMonthlyDay`、`isWeekendDate`、`todayStart`，确保边界情况（2 月闰年/非闰年、30 天月份、31 天月份）。
  - 验收：`npm test` ✅（42 files / 308 tests passed）；`npm run type-check` ✅；`npm run build` ✅。

- 2026-03-18 12:27-12:30（Asia/Shanghai）交付：新增 `CONTRIBUTING.md` 文件，包含 PR 检查清单（测试通过/代码质量/安全考虑/文档/提交规范）和开发环境说明。
  - 变更：新增 `CONTRIBUTING.md`
  - 验收：`npm test` ✅（42 files / 301 tests passed）；`npm run type-check` ✅；`npm run build` ✅
  - 提交：`d957d71 docs: add CONTRIBUTING.md with PR checklist`
  - 验证命令：`git log -1 --oneline`

- 2026-03-18 03:10-03:15（Asia/Shanghai）小幅加固：`normalizeAiBaseUrl()` 防御性拒绝非 string 入参（避免上层误传 null/undefined 导致 `.trim()` 直接抛 TypeError，错误信息不友好）。
  - 变更：`src/utils/ai.ts` 与轻量模块 `src/utils/ai-config.ts` 在 `trim()` 之前增加 `typeof input !== 'string'` 校验，并统一报错为"API 地址格式不正确"。
  - 测试：`src/utils/__tests__/ai-proxy-guard.test.ts`、`src/utils/__tests__/ai-config.test.ts` 新增用例覆盖 `null/undefined/number`。
  - 验收：`npm test` ✅（42 files / 301 tests passed）；`npm run type-check` ✅。

- 2026-03-18 00:32-00:34（Asia/Shanghai）小幅重构：`ai-config` 复用 shared proxy guard，消除重复实现并对齐安全策略。
  - 背景：`src/utils/ai-config.ts`（配置弹窗使用的轻量模块）此前内置了一份 hostname/target 校验逻辑，容易与 `src/utils/ai-proxy-guard.ts` / `src/utils/ai.ts` 漂移。
  - 变更：`src/utils/ai-config.ts` 改为直接复用 `isPrivateOrUnsafeHostname` + `isAllowedAiProxyTargetUrl`；同时补齐与主实现一致的校验：
    - baseUrl 禁止 `username/password`
    - baseUrl strip `query/hash`
    - proxy target guard 一并拒绝 `query/hash` + credentials
  - 验收：`npm test` ✅（41 files / 293 tests passed）；`npm run type-check` ✅。

- 2026-03-18 01:39-01:40（Asia/Shanghai）交付：为轻量模块 `src/utils/ai-config.ts` 补齐单测，防止与主实现 `src/utils/ai.ts` 的校验规则漂移。
  - 新增：`src/utils/__tests__/ai-config.test.ts` 覆盖 baseUrl 规范化、/v1 拼接、query/hash 剥离、credentials 拒绝、私网/localhost 拒绝、以及 `sanitizeAiConfig` 裁剪与默认模型。
  - 验收：`npm test` ✅（42 files / 299 tests passed）。

- 2026-03-18 05:43（Asia/Shanghai）安全加固：阻断 IPv4 在 URL host 中的"0.0.0.0/8 混淆"绕过（SSRF/内网探测防护）。
  - 背景：Node/WHATWG URL 会把一些非 dotted-quad 的 host 归一化为 IPv4（例如 `http://127/` -> `0.0.0.127`），若只拦 `127.*` 可能漏掉归一化后的 `0.*`。
  - 变更：`src/utils/ai-proxy-guard.ts` 对 IPv4 literal 增加 `0.0.0.0/8` 拦截（`startsWith('0.')`），并新增对应单测（拒绝 `http://127/` / `http://0.0.0.127/`）。
  - 提交：`ab49107 fix(security): block IPv4 obfuscation via 0.0.0.0/8`
  - 验收（本地复跑）：`npm test` ✅（42 files / 301 tests passed）；`npm run type-check` ✅。
  - 验证命令：`npm test && npm run type-check`

- 2026-03-18 07:11-07:15（Asia/Shanghai）CI 小改进：新增每周 strict workflow，运行 build:verify 并开启 build budget / Vite oversize 严格模式（不影响 PR/默认 CI）。
  - 新增：.github/workflows/ci-strict-weekly.yml（schedule + workflow_dispatch）
  - env：CI_STRICT_BUILD_BUDGET=1, CI_STRICT_VITE_OVERSIZE=1
  - 验收：npm test ✅；npm run type-check ✅。

- 2026-03-18 08:44-08:46（Asia/Shanghai）补强安全测试：为 AI proxy guard 增加更多「IPv4 非标准写法会被 URL 解析器归一化」的回归用例。
  - 背景：Node/WHATWG URL 会把短写法/八进制/十六进制/整数形式归一化到 dotted-quad；如果 guard 只覆盖少数形式，未来重构/依赖升级容易漏拦。
  - 变更：`src/utils/__tests__/ai-proxy-guard.test.ts` 新增拒绝用例：`127.1`、`127.0.1`、`0177.0.0.1`、`0x7f.0x0.0x0.0x1`、`0xffffffff`、`4294967295`、`0300.0250.0000.0001`、`0`、`0000`。
  - 验收：`npm test` ✅（42 files / 301 tests passed）；`npm run type-check` ✅。

- 2026-03-18 11:54-11:58（Asia/Shanghai）补强 IPv6 边界测试：为 ai-proxy-guard 增加更多 IPv6 前缀的明确测试用例。
  - 背景：现有测试已覆盖 IPv6 loopback (`[::1]`), IPv4-mapped (`[::ffff:127.0.0.1]`), ULA (`fc00::/7`), link-local (`fe80::/10`)，但未明确覆盖 NAT64/文档前缀等公网可路由地址的行为。
  - 变更：`src/utils/__tests__/ai-proxy-guard.test.ts` 新增用例：
    - `64:ff9b::1` (NAT64 前缀) → ALLOWED (公网可路由)
    - `2001:db8::1` (IPv6 文档前缀) → ALLOWED (文档空间，非私网)
    - `2001:4860:4860::8888` (Google Public DNS) → ALLOWED (公网 DNS)
    - `::` (未指定地址) → BLOCKED
  - 验收：`npm test` ✅（42 files / 301 tests passed）；`npm run type-check` ✅；`npm run build` ✅。
  - 验证命令：`npm test && npm run type-check && npm run build`。
