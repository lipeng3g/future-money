# NEXT_TASK（协同任务池）

> 约定：任何 worker 开始工作前先读本文件；完成一个最小可验收改动后再更新本文件。

## 0. 想法入口（你/其它 AI 直接追加在这里）
- 

## 1. 近期最小可交付（按优先级）
- [x] 梳理 future-money 当前“最小闭环”验收路径，并补齐 README 的验收步骤
- [x] 为关键页面/关键链路补 1-2 个 smoke 测试（CI 里跑）
- [x] 梳理并固化构建/CI 的稳定性策略（chunk budget、warnings-as-fail、缓存命中）
  - 已固化：CI Node 版本对齐 `.node-version`（setup-node `node-version-file`），并显式 `cache-dependency-path: package-lock.json`；安装使用 `npm ci --prefer-offline --no-audit`，提升 cache 命中与可复现性。
  - 后续可选（需决策）：是否将 `CI_STRICT_BUILD_BUDGET=1` / `CI_STRICT_VITE_OVERSIZE=1` 作为默认失败条件（见下方待澄清）。

## 2. 技术债与风险
- [ ] secrets/环境变量规范（本地、CI、生产）
- [ ] 错误可诊断：错误码/trace id/最小复现模板

## 3. 待澄清
- [ ] 后续是否要求所有变更都走 PR（禁止直推 main）？
