# FutureMoney 用户注册与 Cloudflare 云端存储规划

> 规划日期：2026-07-23。目标是在不购买传统服务器的前提下，为 FutureMoney 增加正式用户体系、多设备数据保存和可恢复能力，同时保留现有本地优先体验。

## 一、结论

推荐在现有 Cloudflare Pages 项目上扩展一套无服务器架构：

- **前端**：继续由 Cloudflare Pages 托管，保留 `future-money.pages.dev` 和 GitHub `main` 自动部署。
- **API**：使用同一 Pages 项目的 Pages Functions 提供 `/api/*`，不新增第二个正式站点。
- **API 框架**：Hono + Cloudflare Pages adapter。
- **用户认证**：Better Auth + Drizzle，认证表存入 Cloudflare D1。
- **首期登录方式**：邮箱 + 密码；注册、重置密码邮件通过可替换的事务邮件服务发送。
- **防滥用**：Cloudflare Turnstile 免费版保护注册、登录和重置密码接口。
- **资金数据**：D1 每个用户保存一个加密 JSON 数据快照，不在第一期拆分账户、交易、分类和周期表。
- **本地缓存**：继续使用 Zustand + localStorage；登录后后台同步，离线时仍可查看和修改。
- **多设备冲突**：使用单调递增 `revision` 做乐观锁，不做复杂实时协同。

这套方案没有常驻进程、虚拟机、Docker 服务器或自建 MySQL，初期可以运行在 Cloudflare 免费额度内。前端和 API 保持同源，现有用户也不需要更换地址或丢失该域名下的 localStorage。

## 二、为什么不买服务器

传统方案通常需要：

- 一台 VPS；
- Nginx、Node.js 服务和数据库；
- 系统升级、证书、备份、监控与安全维护；
- 即使没有用户也持续产生固定月费。

FutureMoney 当前是个人资金工具，访问模式以静态资源、登录、读取一次数据、少量后台保存为主，不需要常驻服务器。Cloudflare Worker 的按请求执行模式更适合这一负载。

## 三、Cloudflare 当前免费边界

根据 2026-07-23 Cloudflare 官方文档：

| 产品 | 免费额度关键项 | 本项目用途 |
| --- | --- | --- |
| Workers / Pages Functions | 100,000 个动态请求/天 | 登录、数据读取与保存 API |
| D1 | 5,000,000 rows read/天 | 用户、会话和资金快照读取 |
| D1 | 100,000 rows written/天 | 会话与资金快照保存 |
| D1 | 5 GB 总存储 | 用户与加密资金数据 |
| Turnstile | 免费，验证请求不限量 | 注册、登录、找回密码防刷 |
| Pages | 静态资源由 Cloudflare 缓存，GitHub 推送后自动构建 | React、CSS、字体等资源 |

官方来源：

- <https://developers.cloudflare.com/workers/platform/pricing/>
- <https://developers.cloudflare.com/d1/platform/pricing/>
- <https://developers.cloudflare.com/workers/static-assets/>
- <https://developers.cloudflare.com/turnstile/plans/>

额度可能调整，实施时仍应增加用量告警，不能把“当前免费”当成永久承诺。

### 3.1 粗略容量估算

假设每名活跃用户每天触发 20 次云端保存：

- 1,000 名日活用户约产生 20,000 次资金快照写入；
- 5,000 名日活用户约达到 100,000 次写入上限；
- 静态资源命中时默认不需要执行 Worker 代码。

FutureMoney 初期远低于此规模。通过 1～2 秒防抖和批量保存，可以避免每个输入动作都写 D1。

## 四、部署拓扑

```text
浏览器
  │
  ├─ /assets/* ──────────────> Cloudflare Pages 静态资源
  │
  └─ /api/* ─────────────────> Pages Functions / Hono
                                  │
                                  ├─ Better Auth
                                  ├─ Turnstile 校验
                                  ├─ 数据加密/解密
                                  │
                                  └─ Cloudflare D1
                                      ├─ 用户与会话表
                                      └─ user_vaults 资金快照
```

前端和 API 使用现有 Pages 项目的同一域名，可直接使用安全 Cookie，避免跨域、额外网关和两个公开部署项目。

## 五、用户注册方案

### 5.1 推荐方案

第一期使用：

1. 邮箱 + 密码注册；
2. 邮箱验证后才允许开启云同步；
3. 支持忘记密码；
4. 注册、登录和重置密码前验证 Turnstile；
5. 登录状态使用 `HttpOnly + Secure + SameSite=Lax` Cookie；
6. 会话与账号表由 Better Auth 管理，不自行实现密码哈希和令牌协议。

Better Auth 官方已有 Hono 集成、邮箱密码认证和 Drizzle SQLite 适配，适合 Worker + D1：

- <https://www.better-auth.com/docs/integrations/hono>
- <https://www.better-auth.com/docs/authentication/email-password>
- <https://www.better-auth.com/docs/adapters/drizzle>

### 5.2 邮件服务

Cloudflare Email Routing 不等同于通用事务邮件发送服务。验证邮件与重置密码邮件应通过抽象接口发送：

```ts
interface AuthEmailSender {
  sendVerificationEmail(input: { email: string; url: string }): Promise<void>;
  sendPasswordResetEmail(input: { email: string; url: string }): Promise<void>;
}
```

首个实现可以使用 Resend 等带免费额度的 API 服务，但业务代码不绑定供应商。邮件是未来唯一可能随用户规模产生的小额外部成本，不需要为它购买服务器。

### 5.3 暂不作为第一入口的方案

- **仅 GitHub 登录**：开发者方便，但普通个人用户覆盖不足。
- **仅 Google 登录**：减少邮件成本，但国内网络环境不稳定。
- **Cloudflare Access**：适合内部员工或邀请用户访问，不是公开产品的自助注册系统。
- **自行实现密码认证**：安全风险和维护成本过高。
- **Passkey**：体验和安全性好，但恢复、换机和兼容性需要单独设计，可作为第二登录方式。

后续可以增加 Google/GitHub OAuth，并与同邮箱账号做安全关联，但不阻塞第一期。

## 六、资金数据存储

### 6.1 不立即拆成多张业务表

当前 `AppData` 已经是稳定的导入导出结构：

```ts
interface AppData {
  version: number;
  accounts: Account[];
  transactions: Transaction[];
  series: Series[];
  categories: Category[];
}
```

第一期若把它拆为 D1 的账户、交易、分类、周期表，会引入：

- 大量 API 和迁移代码；
- 每次修改涉及多表事务；
- 本地 Zustand 与云端关系模型的双重状态维护；
- 删除、导入、合并和版本兼容风险。

服务端当前不需要查询“所有用户的房贷记录”或生成跨用户报表，因此关系化业务数据没有实际收益。

### 6.2 推荐的快照表

```sql
CREATE TABLE user_vaults (
  user_id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL DEFAULT 0,
  schema_version INTEGER NOT NULL,
  key_version INTEGER NOT NULL,
  iv TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);
```

- 一个用户只保存一行当前资金数据；
- 一次读取只扫描一行；
- 一次保存只更新一行；
- `schema_version` 对应现有 `DATA_VERSION`；
- `revision` 用于多设备冲突检测；
- `iv + ciphertext + key_version` 用于 AES-GCM 加密与未来密钥轮换。

等真正需要服务端统计、分享或团队协作时，再把业务数据迁移为关系表。

## 七、数据安全

### 7.1 第一阶段加密边界

资金 JSON 通过 HTTPS 发送到 Worker，由 Worker 使用 Web Crypto AES-GCM 加密后写入 D1。主密钥只保存在 Cloudflare Worker Secret：

```text
DATA_ENCRYPTION_KEY_V1
```

每个用户使用独立随机 IV，并记录 `key_version`。这样直接读取 D1 数据库不会看到明文资金记录。

这不是零知识加密：掌握 Worker 运行权限与密钥的人仍可解密。若未来需要“平台也无法读取”，必须增加浏览器端密钥和恢复码，这会显著增加密码找回与多设备恢复复杂度，第一期不做。

### 7.2 必须实现的安全措施

- 所有数据 API 先验证 Better Auth 会话；
- `user_id` 永远来自会话，不能接受前端传入；
- 注册、登录、重置密码校验 Turnstile；
- Cookie 使用 `HttpOnly`、`Secure`、`SameSite=Lax`；
- API 校验 JSON 大小、schema 版本和数据结构；
- Worker Secret 不进入 Git、前端 bundle 或日志；
- 日志不记录邮箱、资金 JSON、Cookie 和令牌；
- 提供导出数据和删除账号能力；
- 删除账号时级联删除资金快照和会话。

## 八、本地优先与云同步

### 8.1 存储隔离

当前单一的 `future-money` localStorage key 要调整为：

```text
future-money:guest
future-money:user:{userId}
```

防止同一浏览器切换账号后看到上一个用户的数据。

### 8.2 保存流程

1. 所有操作先写 Zustand 和当前用户本地缓存，界面立即响应；
2. 1～2 秒防抖后提交完整 `AppData + expectedRevision`；
3. Worker 校验 revision、加密并更新 D1；
4. 返回新 revision 和服务器更新时间；
5. 页面显示“正在保存 / 已保存 / 离线 / 存在冲突”。

### 8.3 API

```text
GET    /api/v1/vault          读取当前用户快照
PUT    /api/v1/vault          按 expectedRevision 保存
DELETE /api/v1/vault          删除云端资金数据
DELETE /api/v1/account        删除账号及全部数据
GET    /api/v1/health         部署健康检查
/api/auth/*                   Better Auth 路由
```

保存请求示例：

```json
{
  "expectedRevision": 12,
  "data": {
    "version": 1,
    "accounts": [],
    "transactions": [],
    "series": [],
    "categories": []
  }
}
```

### 8.4 冲突策略

Worker 只在 `expectedRevision` 与当前 revision 相同时保存，否则返回 `409 Conflict`。

第一期不做逐字段自动合并。发生冲突时提供：

- 使用云端版本；
- 导出当前本地版本；
- 明确确认后用本地版本覆盖云端。

这比静默“最后写入覆盖”更适合财务数据。

### 8.5 首次登录迁移

检测到游客数据时不能自动覆盖云端，应展示：

- 将本机数据上传为云端数据；
- 使用已有云端数据；
- 先导出本机备份；
- 两边都有数据时进入明确的导入/合并确认流程。

## 九、建议目录

```text
src/
  ...                         现有 React 前端
  services/
    authClient.ts
    cloudVault.ts
  hooks/
    useCloudSync.ts
functions/
  api/
    [[route]].ts               Pages Functions catch-all 入口
server/
  app.ts                       Hono 应用
  auth.ts                      Better Auth 配置
  crypto.ts                    AES-GCM 与密钥版本
  routes/
    vault.ts
    account.ts
  db/
    schema.ts
    migrations/
wrangler.jsonc
drizzle.config.ts
```

## 十、实施阶段

### 阶段 A：Cloudflare 工程骨架

- 保留现有 Vite + Cloudflare Pages 构建和 GitHub 自动部署；
- 引入 Wrangler、Hono 和 Pages Functions catch-all 入口；
- 同一 Pages 部署提供 SPA 静态资源与 `/api/v1/health`；
- 创建本地与远程 D1 配置；
- 建立 Drizzle migrations；
- CI 执行测试、构建和 migration 检查。

验收：本地 Pages 预览和 `future-money.pages.dev` 均可打开现有应用，健康检查正常。

### 阶段 B：用户认证

- 接入 Better Auth + D1；
- 完成注册、登录、退出、邮箱验证、忘记密码；
- 接入 Turnstile；
- 增加登录抽屉和顶栏用户菜单；
- 会话接口测试与未授权测试。

验收：注册、验证、登录、刷新会话、退出和密码重置全流程通过。

### 阶段 C：加密云端快照

- 创建 `user_vaults`；
- 实现 AES-GCM 加密、密钥版本与 vault API；
- localStorage 按 guest/user 隔离；
- 实现防抖保存、同步状态和离线重试；
- 顶栏主状态展示本地/云端保存结果。

验收：D1 中无明文资金数据；刷新和另一设备登录可以恢复数据。

### 阶段 D：迁移、冲突与数据权利

- 游客数据首次登录迁移；
- revision 冲突处理；
- 导出、删除云端数据、注销账号；
- 故障注入：断网、重复请求、旧 revision、错误 schema；
- 增加 Cloudflare 用量告警和错误监控。

验收：任何冲突都不会静默丢失本机或云端数据，用户可以完整导出和删除自己的数据。

### 阶段 E：正式部署

- 配置生产域名、D1 binding 和 Worker Secrets；
- 设置安全响应头和 CORS 同源策略；
- 执行生产 migration；
- 小范围邀请测试；
- 确认免费额度与告警后再开放注册。

## 十一、明确不做

- 不购买 VPS 或云服务器；
- 不部署自建 MySQL、PostgreSQL 或 Redis；
- 不在第一期做实时协作和 WebSocket 同步；
- 不在第一期把全部业务数据关系化；
- 不静默合并或覆盖两台设备的财务数据；
- 不在浏览器保存认证 Cookie、密码或服务端加密主密钥；
- 不承诺 Cloudflare 和邮件供应商的免费额度永久不变。

## 十二、下一步决策

建议下一步先开发阶段 A，而不是直接写注册页面。先证明现有 React 应用可以通过同一个 Cloudflare Pages 项目提供静态资源、Pages Functions API 和 D1 migration，再接入认证，能最早暴露运行时与依赖兼容问题。

第一期“邮箱 + 密码 + 邮件验证”已于 2026-07-23 确认。OAuth 和 Passkey 留到后续，不阻塞云端存储主链路。阶段 A 已进入实施，执行记录见《Cloudflare 工程骨架实施》。
