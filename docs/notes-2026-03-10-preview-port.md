# Preview 端口说明（避免 smoke 指南误导）

当前仓库的 `npm run preview` 在 CI/多任务环境里可能遇到端口占用，Vite 会自动递增选择可用端口。

因此在按 `docs/browser-chart-smoke.md` 做页面级 smoke 时：

- 不要强依赖 `--port 4175` 一定生效
- 以 `npm run preview` 输出的 `Local: http://127.0.0.1:<port>/` 为准

示例输出：

```
➜  Local:   http://127.0.0.1:4210/
```

若确需固定端口，可先停掉占用进程或改用空闲端口。
