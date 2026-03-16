# WORKLOG（可审阅的工作日志）

> 只记录“可验证的改动/结论/取舍”。不要写入敏感信息。

## 2026-03-16
- 引入 `.agent/` 协同开发区：把任务/进展/决策放进仓库，便于你和其它 AI 参与协作
- 验收主线已包含 AI 分析 empty_stream 自动恢复：前端在首包前断流时自动重试，并支持降级恢复与诊断复制；相关验证命令：`npm test`、`npm run type-check`、`npm run build`
- 验收命令结果：全部通过。已确认覆盖 AI 分析恢复测试、清空会话刷新不回归测试，以及现金流事件日期布局相关测试；提交并推送：`574dd44 chore: record ai recovery verification`；远端确认命令：`git log -1 --oneline` -> `574dd44 chore: record ai recovery verification`
- 复核当前 `main`：P0-1/P0-2/P1 相关代码、测试与 README 验收路径均已在分支上。2026-03-16 17:14–17:16（Asia/Shanghai）再次执行 `npm test`、`npm run type-check`、`npm run build` 全部通过；当前 HEAD=`a5b8964 test(smoke): add minimal reconciliation journey + README path`。验证点：`src/utils/__tests__/ai-stream.test.ts` 覆盖 empty_stream 自动重试/降级/诊断，`src/components/ai/__tests__/AiAnalysisModal.test.ts` 覆盖前端无重复输出与可恢复提示，`src/stores/__tests__/finance-smoke.test.ts` 覆盖清空会话刷新不回流，`src/components/charts/__tests__/UpcomingEvents.test.ts` 覆盖事件日期列表布局。
- 2026-03-16 20:14–20:16（Asia/Shanghai）再次按提交纪律复核：`npm test`（39 files / 272 tests passed）、`npm run type-check`、`npm run build` 全通过；当前 `origin/main` 与本地 `main` 同步，验证提交：`892a1cd chore(build): make build:verify portable without tee`。本次未发现 P0-1 empty_stream 自动恢复、P0-2 清空会话刷新、P1 “查看图上日期” 布局的回归；远端确认命令：`git log -1 --oneline`、`git rev-parse HEAD && git rev-parse origin/main`。
- 2026-03-16 22:13–22:16（Asia/Shanghai）future-money autonomous worker 复核：再次执行 `npm test`、`npm run type-check`、`npm run build` 全通过；核对 `src/utils/ai.ts`、`src/components/ai/AiAnalysisModal.vue`、`src/utils/__tests__/ai-stream.test.ts`、`src/components/ai/__tests__/AiAnalysisModal.test.ts`、`src/components/events/EventCard.vue`，确认 P0-1 已实现 empty_stream 首包前自动重试（300ms/800ms）+ 单次降级补拉（当前实现为备用模型 `gpt-5.2` + `stream=false`）、保留 scope 锁定与草稿、输出诊断 provider/model/traceId/httpStatus/retries、成功时无重复输出；P0-2 清空会话刷新不回归；P1 “查看图上日期” 已通过 `word-break`/`overflow-wrap`/`min-width: 0` 避免撑爆布局。对应审计提交：待本条提交后补记；远端确认命令：`git log -1 --oneline`。
- 2026-03-16 23:21–23:23（Asia/Shanghai）固化 CI 稳定性：CI 使用 `actions/setup-node@v4` 的 `node-version-file: .node-version` 对齐本地/线上 Node 版本；显式设置 `cache-dependency-path: package-lock.json` 提升 npm cache 命中确定性；安装步骤使用 `npm ci --prefer-offline --no-audit`（锁文件严格 + 更友好缓存命中）。本地验收：`npm run smoke`、`npm run build:verify` 全通过。

## 2026-03-17
- 为“错误可诊断（最小复现模板）”补齐 GitHub Issue 模板：新增 `.github/ISSUE_TEMPLATE/bug_report.yml`，引导提交者提供 **最小复现步骤** + **诊断信息**（浏览器/系统、Console/Network、AI 场景下的 provider/model/http status/traceId），并提醒导出的 JSON 快照需脱敏。
- README 在「贡献」处补充指引：报告 Bug 使用 Bug report 模板，按诊断字段填写，降低来回追问成本。
- 验收命令：`npm test`（39 files / 272 tests passed）。
- 2026-03-17 02:14–02:16（Asia/Shanghai）future-money autonomous worker 再次复核 P0-1/P0-2/P1：
  - `npm test` 通过（39 files / 272 tests）
  - `npm run type-check` 通过
  - `npm run build` 通过
  - 复核实现位置：`src/utils/ai.ts`、`src/components/ai/AiAnalysisModal.vue`、`src/utils/__tests__/ai-stream.test.ts`、`src/components/ai/__tests__/AiAnalysisModal.test.ts`、`src/stores/__tests__/finance-smoke.test.ts`、`src/components/events/EventCard.vue`
  - 结论：P0-1 已包含 empty_stream 首包前自动重试（300ms/800ms）+ 降级恢复（当前实现为优先备用模型 `gpt-5.2` 且使用 `stream=false` 拉全量结果）+ 诊断信息 provider/model/traceId/httpStatus/retries + 成功时清空旧 buffer 避免重复输出；P0-2 清空会话刷新不回归；P1 “查看图上日期” 已通过换行/断词约束避免撑爆布局。
  - 远端确认命令：`git log -1 --oneline`、`git rev-parse HEAD && git rev-parse origin/main`。
- 2026-03-17 03:14–03:16（Asia/Shanghai）按 autonomous worker 提交纪律再次执行验收复跑并审源码：
  - `npm test` 通过（39 files / 272 tests）
  - `npm run type-check` 通过
  - `npm run build` 通过
  - 审核代码位置：`src/utils/ai.ts` 中 `streamChatWithRecovery()` 仍包含 empty_stream 指数退避自动重试（300ms / 800ms）与重试耗尽后 `gpt-5.4 -> gpt-5.2` 且 `stream=false` 的单次降级补拉；`src/components/ai/AiAnalysisModal.vue` 仍在成功恢复时复用新结果覆盖 buffer、失败时展示 provider/model/traceId/httpStatus/retries 可复制诊断，并保留 scope 锁定与草稿；`src/stores/__tests__/finance-smoke.test.ts` 仍覆盖清空/删除后的刷新不回流；`src/components/events/EventCard.vue` 仍通过 `min-width: 0` + `overflow-wrap:anywhere` 约束“查看图上日期”按钮不撑爆布局。
  - 结论：当前 `main`/`origin/main` 的可验收版本已经满足本轮 P0-1 / P0-2 / P1 要求，本次无功能代码变更，仅补充审计日志并按纪律推送。
