# FutureMoney Cloudflare 工程骨架实施

> 实施日期：2026-07-23。本文是《用户注册与 Cloudflare 云端存储规划》的阶段 A 执行文档，先建立可部署、可迁移、可验证的工程底座，不提前混入注册界面和资金同步逻辑。

## 一、已确认决策

- 第一版使用“邮箱 + 密码 + 邮件验证”。
- 前端与 API 使用同一个 Cloudflare Worker 和同一个域名。
- 使用 Hono 提供 `/api/*`。
- 使用 Cloudflare D1；不购买 VPS，不部署自建数据库或 Redis。
- 资金数据后续按用户保存加密 JSON 快照，阶段 A 暂不创建资金业务表。
- 测试部署可以先使用免费的 `workers.dev` 地址，正式域名不阻塞阶段 A。

## 二、阶段 A 范围

本阶段交付：

1. Cloudflare Vite 插件和 Wrangler 配置；
2. 同一构建产物中的 React SPA 与 Hono Worker；
3. `/api/v1/health` 健康检查；
4. 本地与远程 D1 binding；
5. Drizzle schema 和可重复执行的 migration；
6. GitHub Actions 类型检查、测试、migration 和构建流程；
7. Cloudflare 测试部署与线上请求验收。

本阶段不做：

- 注册、登录、退出和找回密码界面；
- Better Auth 数据表；
- Turnstile；
- 事务邮件；
- 资金快照同步和游客数据迁移。

这些内容分别进入阶段 B、C 和 D，避免底层部署问题与产品功能问题互相干扰。

## 三、工程结构

```text
worker/
  index.ts                       Hono Worker 入口
  db/
    schema.ts                    Drizzle SQLite schema
    migrations/                 D1 migration 文件
.github/workflows/ci.yml         自动验证
wrangler.jsonc                   Worker、Static Assets 与 D1 binding
drizzle.config.ts                migration 生成配置
worker-configuration.d.ts        Wrangler 生成的运行时与 binding 类型
```

路由规则：

```text
/api/*        先进入 Hono Worker
其他路径       优先读取静态资源，未命中时回退 index.html
```

这样既能让 `/api/v1/health` 返回 JSON，也能让未来前端路由刷新时继续打开 SPA。

## 四、数据库策略

阶段 A 只创建 `app_metadata`，用于证明 schema、migration、本地 D1 和远程 D1 的完整链路：

```sql
CREATE TABLE app_metadata (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
```

Better Auth 表由阶段 B 根据最终接入版本生成，不在此阶段手写；`user_vaults` 由阶段 C 创建。这样可以避免为了验证基础设施而过早冻结业务表结构。

## 五、执行顺序

### 5.1 本地链路

```bash
npm install
npm run cf:types
npm run db:generate
npm run db:migrate:local
npm run type-check
npm run test
npm run build
npm run preview
```

本地验收请求：

```bash
curl http://127.0.0.1:4173/api/v1/health
curl -I http://127.0.0.1:4173/ledger/history
```

### 5.2 Cloudflare 链路

1. 通过 `wrangler login` 完成浏览器授权；
2. 创建 `future-money` D1 数据库；
3. 将 Cloudflare 返回的 `database_id` 写入 `wrangler.jsonc`；
4. 执行远程 migration；
5. 构建并部署 Worker；
6. 请求线上首页、SPA 深层路径、健康检查和未知 API；
7. 确认 D1 中存在 migration 记录与 `app_metadata` 表。

## 六、用户介入节点

阶段 A 只有一个必须由用户完成的节点：

- `wrangler login` 打开 Cloudflare 授权页时，确认登录和授权。

以下内容暂不阻塞：

- 正式域名：先使用 `workers.dev`；
- Resend 账号和发信域名：进入阶段 B 再准备；
- Turnstile site key：进入阶段 B 再创建；
- Worker Secret：认证和加密功能开发到相应阶段时再生成。

任何 Token、Cookie、认证密钥和数据加密密钥都不得写进 Git、文档、聊天记录或前端环境变量。

## 七、验收标准

阶段 A 完成必须同时满足：

- `npm run type-check` 通过；
- 全部 Vitest 测试通过；
- 本地 D1 migration 成功；
- `npm run build` 同时生成 Worker 和 SPA；
- 本地和线上 `/api/v1/health` 返回 `200`，并报告 D1 正常；
- 未知 `/api/*` 返回 JSON `404`；
- SPA 深层路径返回前端页面而不是 Cloudflare 404；
- GitHub Actions 不依赖生产 Secret 即可验证本地链路；
- 本地验收进程结束后不残留后台服务。

## 八、失败与回退

- 远程 D1 migration 失败时停止部署，不修改本地用户数据；
- Worker 部署失败时保留现有线上版本，不删除 D1；
- 阶段 A 不读取或上传现有 localStorage 财务数据；
- 不用 `wrangler delete`、数据库删除或覆盖性命令处理部署问题；
- 每次远程写操作前先核对 Cloudflare 账号和资源名称。

## 九、当前执行状态

- [x] 架构选择确认；
- [x] Cloudflare Vite、Wrangler、Hono、Drizzle 依赖接入；
- [x] Worker、Static Assets 和本地 D1 配置；
- [x] 健康检查与 API 404；
- [x] 首个 migration；
- [x] CI 骨架；
- [x] 本地类型检查、测试、构建与真实请求验收；
- [ ] Cloudflare 浏览器授权；
- [ ] 远程 D1 创建和 migration；
- [ ] `workers.dev` 部署和线上验收；
- [ ] 阶段 A 提交并推送。
