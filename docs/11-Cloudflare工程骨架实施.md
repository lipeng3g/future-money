# FutureMoney Cloudflare Pages 工程骨架实施

> 实施日期：2026-07-23。本文是《用户注册与 Cloudflare 云端存储规划》的阶段 A 执行文档。项目继续使用现有 `future-money.pages.dev` 与 GitHub 自动部署，不再建立第二个正式站点。

## 一、部署现状与纠正结论

FutureMoney 已有 Cloudflare Pages 项目：

```text
GitHub main
  └─ Cloudflare Pages Git 集成自动构建
       └─ https://future-money.pages.dev
```

阶段 A 初次实施时误将 Workers + Static Assets 当作新的正式部署目标，产生了独立的 `workers.dev` 地址。该地址不是 GitHub 自动部署，也不与 Pages 域名共享 localStorage。

纠正后的唯一正式方案：

- `future-money.pages.dev` 继续作为正式地址；
- GitHub `main` 推送继续触发 Cloudflare Pages 自动部署；
- GitHub Actions 只负责类型检查、测试、migration 检查和构建，不重复发布；
- `/api/*` 使用 Pages Functions + Hono；
- 已创建的 APAC D1 绑定到 Pages 项目继续使用；
- 临时 `workers.dev` 版本只在 Pages 验收成功且用户明确确认后删除。

## 二、已确认产品决策

- 第一版使用“邮箱 + 密码 + 邮件验证”。
- 前端与 API 必须使用同一个 Pages 域名。
- 使用 Hono 提供 `/api/*`。
- 使用 Cloudflare D1，不购买 VPS，不部署自建数据库或 Redis。
- 资金数据后续按用户保存加密 JSON 快照，阶段 A 暂不创建资金业务表。
- 保留原地址是必要条件，不做未经确认的域名迁移。

## 三、阶段 A 范围

本阶段交付：

1. 保持标准 Vite `dist/` 输出，兼容现有 Pages 构建配置；
2. Pages Functions catch-all 入口；
3. Hono `/api/v1/health` 与 JSON 404；
4. Pages 项目的 D1 binding；
5. Drizzle schema 和可重复执行的 migration；
6. GitHub Actions 类型检查、测试、本地 migration 和构建；
7. `future-money.pages.dev` 自动部署与线上验收。

本阶段不做注册 UI、Better Auth、Turnstile、事务邮件和资金同步；它们分别进入阶段 B、C 和 D。

## 四、工程结构

```text
functions/
  api/
    [[route]].ts                 Pages Functions catch-all 入口
server/
  app.ts                         Hono 应用
  __tests__/app.test.ts          API 单元测试
  db/
    schema.ts                    Drizzle SQLite schema
    migrations/                 D1 migration
.github/workflows/ci.yml         GitHub CI，不执行部署
wrangler.jsonc                   Pages 输出目录与 D1 binding
drizzle.config.ts                migration 生成配置
worker-configuration.d.ts        Wrangler 生成的运行时类型
```

路由关系：

```text
/assets/*            Cloudflare Pages 静态资源
/api/*               functions/api/[[route]].ts -> Hono
其他前端路径           Pages SPA 回退到 index.html
```

## 五、数据库策略

阶段 A 只创建 `app_metadata`，用于验证 schema、migration、本地 D1 和远程 D1：

```sql
CREATE TABLE app_metadata (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
```

Better Auth 表由阶段 B 根据最终版本生成；`user_vaults` 由阶段 C 创建。

已创建的 `future-money` D1 位于 APAC，当前只有 migration 元数据和 `app_metadata` 空表，没有用户资金数据。

## 六、本地开发与验证

普通前端开发：

```bash
npm run dev
```

完整 Pages + Functions 验收：

```bash
npm run cf:types
npm run db:migrate:local
npm run build
npm run dev:pages
```

验证：

```bash
curl http://127.0.0.1:8788/api/v1/health
curl -I http://127.0.0.1:8788/ledger/history
```

## 七、生产部署链路

```text
本地完成验证
  └─ git push origin main
       ├─ GitHub Actions：类型检查、测试、migration、本地构建
       └─ Cloudflare Pages Git 集成：构建并部署
            ├─ dist/ 静态资源
            ├─ functions/api/[[route]].ts
            └─ D1 binding: DB
```

仓库不保存 Cloudflare OAuth Token、GitHub Token、Cookie、认证密钥或数据加密密钥。

## 八、验收标准

- `npm run type-check` 通过；
- 全部 Vitest 测试通过；
- 本地 D1 migration 成功；
- `npm run build` 输出标准 `dist/index.html`；
- 本地 Pages `/api/v1/health` 返回 `200` 且 D1 正常；
- `future-money.pages.dev/api/v1/health` 返回 `200` 且 D1 正常；
- 未知 `/api/*` 返回 JSON `404`；
- Pages 深层路径返回 SPA；
- GitHub Actions 不部署第二份站点；
- Cloudflare Pages 的 GitHub 自动部署继续使用原地址；
- 不残留本地服务。

## 九、用户介入节点

- 若 Pages 项目尚未绑定 D1，需要在 Cloudflare 项目设置中确认 `DB` binding；
- 临时 Worker 删除前必须由用户再次确认；
- Resend、Turnstile 和正式 Secret 进入阶段 B 后再配置。

## 十、当前状态

- [x] 认证和数据架构确认；
- [x] APAC D1 创建与首个 migration；
- [x] 发现并确认既有 Cloudflare Pages 自动部署；
- [x] 确认保留 `future-money.pages.dev`；
- [x] 将本地未推送实现改为 Pages Functions；
- [x] 本地 Pages 全链路验收；
- [x] 推送 GitHub main；
- [x] 等待 Pages 自动部署；
- [x] 原地址线上验收；
- [x] 用户确认后清理临时 Worker。

### 本地验收结果

- Cloudflare Pages 项目 `future-money` 已确认存在，域名为 `future-money.pages.dev`，Git Provider 为 `Yes`；
- Wrangler 类型已按 Pages + D1 配置重新生成；
- `dist/index.html` 标准 Pages 构建产物正常；
- Pages Functions bundle 编译成功；
- 本地 `/api/v1/health` 返回 `200`，D1 状态为 `ok`；
- 本地未知 API 返回 JSON `404`；
- 本地 `/ledger/history` 返回 SPA 页面；
- 56 项测试通过，本地验收服务已关闭。

### 线上验收结果

- GitHub 提交 `fe65ae5` 已触发 Pages 生产部署；
- GitHub Actions CI 已完成且结论为 `success`；
- 正式地址保持为 <https://future-money.pages.dev>；
- `/api/v1/health` 返回 `200`、`status: ok` 和 `database: ok`；
- 未知 `/api/*` 返回 JSON `404`；
- `/ledger/history` 返回 SPA 页面；
- 浏览器实页确认 React 正常挂载，顶栏、侧栏、资金区和账本均已渲染；
- 浏览器控制台无错误；
- 没有创建第二个 GitHub 部署 workflow，Cloudflare Pages Git 集成仍是唯一生产发布链路。
- 临时 `future-money.lipeng-3g.workers.dev` Worker 已删除并返回 `404`；Pages 项目和 D1 均未受影响。
