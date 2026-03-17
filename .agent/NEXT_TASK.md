# NEXT_TASK（协同任务池）

> 约定：任何 worker 开始工作前先读本文件；完成一个最小可验收改动后再更新本文件。

## 0. 想法入口（你/其它 AI 直接追加在这里）
- 

## 1. 近期最小可交付（按优先级）
- [x] 梳理 future-money 当前“最小闭环”验收路径，并补齐 README 的验收步骤
- [x] 为关键页面/关键链路补 1-2 个 smoke 测试（CI 里跑）
- [x] 梳理并固化构建/CI 的稳定性策略（chunk budget、warnings-as-fail、缓存命中）
- [x] 降噪：补齐 EventPanel 单测对 ant-design-vue 下拉/菜单组件的 stub，消除 `Failed to resolve component` 警告
  - 已固化：CI Node 版本对齐 `.node-version`（setup-node `node-version-file`），并显式 `cache-dependency-path: package-lock.json`；安装使用 `npm ci --prefer-offline --no-audit`，提升 cache 命中与可复现性。
  - 已补齐：`scripts/check-build-log.mjs` 对 Vite oversize 输出行解析的兼容性（支持 `│`/`|`、缺失 gzip 列、严格模式下无法解析会失败），避免 CI 静默放过。
  - 已补齐：`scripts/check-build-chunks.mjs` baseline 非法 JSON / 非 object（含 array）时报错更明确，并有脚本级单测覆盖，避免 CI 里定位困难。
  - 后续可选（需决策）：是否将 `CI_STRICT_BUILD_BUDGET=1` / `CI_STRICT_VITE_OVERSIZE=1` 作为默认失败条件（见下方待澄清）。

## 2. 技术债与风险
- [x] secrets/环境变量规范（本地、CI、生产）
  - 已新增：`docs/ENV.md`、`.env.example`，并在 README 增加快速入口。
- [x] 错误可诊断：错误码/trace id/最小复现模板（已添加 GitHub Bug report Issue 模板并在 README 指引）

## 3. 待澄清
- [ ] 后续是否要求所有变更都走 PR（禁止直推 main）？
  - 推荐选项：
    - **A. 强制 PR（推荐）**：保护 `main`，避免误推；配合 CI（test/type-check/build/smoke）和 CODEOWNERS 更稳。代价是日常改动多一步流程。
    - **B. 允许直推，但仅限维护者**：保持速度，但需要维护者自觉本地跑验收；容易出现“只写日志/未跑验证”的低质量提交。
- [ ] 是否将 CI 中的严格预算开关默认开启（`CI_STRICT_BUILD_BUDGET=1` / `CI_STRICT_VITE_OVERSIZE=1`）？
  - 背景：仓库已支持这些开关，用于将 chunk 体积/oversize 警告升级为失败，防止静默变胖。
  - 推荐选项：
    - **A. 默认开启（推荐在产品趋稳后）**：长期可控；但可能在依赖升级/图表库变动时带来首次修复成本。
    - **B. 默认关闭，仅在 release/主分支定期检查**：减少对日常开发的干扰；但风险是体积回归更晚暴露。
