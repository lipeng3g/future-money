# DECISIONS（关键决策记录）

> 格式建议：日期 - 决策 - 背景/备选 - 选择理由 - 影响范围 - 后续行动

## 2026-03-16 - 引入 `.agent/` 作为协作上下文目录
- 决策：在 future-money 仓库增加 `.agent/`，并以 `.agent/NEXT_TASK.md` 作为任务真相源。
- 背景：原先部分协作信息在宿主机 workspace（对仓库协作者不可见）。
- 影响：后续 worker 必须按 `.agent/WORKER_PROTOCOL.md` 工作并更新 `NEXT_TASK/WORKLOG`。
