# 环境变量（Environment Variables）

> 结论先说：FutureMoney **运行/构建不依赖任何必需的环境变量**。
>
> - 业务数据与 AI 配置均存于浏览器本地（localStorage）
> - 生产环境（Cloudflare Pages）默认可直接 `npm run build` 部署
>
> 本文档用于：把**可选**的 CI/构建校验开关、日志路径等约定固化下来，避免“有人在 CI 里加了开关但没人知道”。

## 1. 本地开发（Local）

### 1.1 必需变量

无。

```bash
npm install
npm run dev
```

### 1.2 AI 相关配置（重要：不是环境变量）

AI（OpenAI 兼容接口）配置在页面内通过「AI 设置」填写：

- `baseUrl`：例如 `https://api.openai.com`（也允许填写完整的 `/chat/completions`，会被规范化）
- `apiKey`：你的 API Key
- `model`：例如 `gpt-4o-mini`

这些配置会被保存到浏览器 localStorage（key: `fm-ai-config`），**不会通过 `.env` 注入**。

> 安全提示：不要把真实 key 写进仓库或 CI 日志。

## 2. 构建与校验（Build / Verify）

项目包含一些“可选的严格模式”开关，主要用于 CI 中把 warning 升级为失败，或指定构建日志路径。

> 这些变量仅影响 `scripts/*` 中的校验行为，不影响应用运行时功能。

### 2.1 `BUILD_LOG_PATH`

- **用途**：指定 `scripts/check-build-log.mjs` 读取的构建日志文件路径
- **默认**：若未设置，会按顺序尝试：
  1) CLI 参数（`node scripts/check-build-log.mjs <path>`）
  2) `BUILD_LOG_PATH`
  3) `./build.log`
- **是否必需**：否
- **示例**：

```bash
BUILD_LOG_PATH=./build.log npm run build:verify
```

### 2.2 `CI_STRICT_VITE_OVERSIZE`

- **用途**：当 Vite 输出“Some chunks are larger than 500 kB after minification”时，
  默认只打印 oversize 列表；在 CI 严格模式下把该 warning 升级为失败。
- **取值**：`"1"` 开启，其它/空关闭
- **是否必需**：否
- **示例（CI）**：

```bash
CI_STRICT_VITE_OVERSIZE=1 npm run build:verify
```

### 2.3 `CI_STRICT_BUILD_BUDGET`

- **用途**：构建产物 chunk budget 校验（`scripts/check-build-chunks.mjs`）中，
  默认只在“超过预算/缺少关键 chunk”时失败；
  该开关会把 **budget warning + oversize warning** 也升级为失败。
- **取值**：`"1"` 开启，其它/空关闭
- **是否必需**：否
- **示例（CI）**：

```bash
CI_STRICT_BUILD_BUDGET=1 npm run build:verify
```

## 3. CI 如何注入

GitHub Actions / 其它 CI 中可通过 job 的 `env:` 注入：

```yaml
env:
  CI_STRICT_VITE_OVERSIZE: '1'
  CI_STRICT_BUILD_BUDGET: '1'
```

若你希望本地复现 CI 行为，可以在命令前临时设置：

```bash
CI=1 CI_STRICT_VITE_OVERSIZE=1 CI_STRICT_BUILD_BUDGET=1 npm run build:verify
```

## 4. 生产环境（Cloudflare Pages）如何注入

默认无需注入任何环境变量。

### 4.1 为什么不用在生产端配置 AI Key？

FutureMoney 的 AI Key 由用户在浏览器端自行配置并本地保存。
生产站点不应该持有或注入统一的 Key。

### 4.2 Cloudflare Pages Functions（`/functions/api/ai-proxy.ts`）

`ai-proxy` 仅做 CORS 转发与目标安全校验：

- 真实目标通过请求头 `X-Target-Url` 传入
- 授权通过请求头 `Authorization` 或（本地 dev server）`X-Auth` 透传

该函数本身不依赖任何环境变量。

## 5. 示例文件

仓库根目录提供：

- `.env.example`：仅占位符，**不包含真实值**

你可以复制一份本地使用（可选）：

```bash
cp .env.example .env
```

> 注意：本项目当前并不读取 `.env` 注入运行配置；`.env` 主要用于你在本机/CI 里统一管理这些可选开关。 
