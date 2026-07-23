# FutureMoney · 资金未来推演

把每一笔（含周期性）资金变动记录为**真实可编辑的记录**，用现代化前台界面直观推演未来数月、数年的资金走势。

> 本仓库已推翻旧版重新设计。设计文档见 [`docs/`](./docs/README.md)。

## 这是什么

一个**本地优先、离线可用**的个人资金规划工具：

- 管理多个账户（现金、理财等），各自有初始余额与起始日；
- 录入一次性 / 周期性（日·周·月·季·半年·年）的收支；
- 周期收支会**展开为一笔笔真实记录**，任意一笔（哪怕是未来的）都能单独改/删；
- 总资产 + 各账户的资金走势曲线，可点击某天进行增删改；
- 对一组周期记录可按时间勾选后批量删/改；
- 数据本地优先，登录后可选择 AES-256-GCM 加密云同步，支持 JSON 导入/导出备份；
- 深 / 浅色主题。

## 技术栈

React + TypeScript + Vite · Semi Design · VChart · Zustand · Hono · Cloudflare Pages/D1 · Vitest

## 在线体验

<https://future-money.pages.dev>

当前部署使用 Cloudflare Pages，GitHub `main` 推送后自动构建；Pages Functions 复用已创建的 APAC D1。游客数据只保存在当前浏览器，登录后由用户明确选择是否上传为加密云端快照；多设备冲突不会静默覆盖。

## 开发

```bash
npm install
npm run dev        # 启动开发服务器（默认 http://localhost:3000）
npm run test       # 运行单元测试（Vitest）
npm run build      # 类型检查 + 构建静态产物到 dist/
npm run preview    # 预览构建产物
```

Cloudflare 工程骨架使用现有 Pages 项目提供 SPA，并由 Pages Functions 提供 `/api/*`。首次启动前初始化本地 D1：

```bash
npm run db:migrate:local
npm run build
npm run dev:pages
curl http://localhost:8788/api/v1/health
```

远程 D1 已绑定在 `wrangler.jsonc`。数据库 schema 更新后，先在本地验证，再执行 `npm run db:migrate:remote`。认证与云同步需要通过 Cloudflare Pages Secret 配置 `BETTER_AUTH_SECRET`、OAuth Provider Secret 和 `DATA_ENCRYPTION_KEY_V1`，密钥不得写入仓库或 `.env.example`。

## 使用指南

1. **建账户**：左侧「账户」面板新建账户，设置名称、初始余额、起始日与配色。
2. **记一笔**：账本区「记一笔」录入单笔；打开「周期重复」可设频率/间隔/结束条件，并在保存前预览将生成的记录数。
3. **看走势**：上方曲线展示总资产与各账户余额，可切换日/周/月粒度与时间范围；点击曲线某天查看当日明细。
4. **改 / 删**：账本行内可改/删任意一笔；点击行尾「整组」图标或「周期」标签，可对一组周期记录按时间勾选（全选/反选/仅未来/仅过去）后批量改金额、改分类或删除。
5. **分类**：顶部「分类管理」维护分类，用于标记工资、房贷、投资等。
6. **备份**：顶部「导出」下载 JSON；「导入」时可预览摘要并选择「覆盖」或「合并（按 ID）」。
7. **主题**：右上角切换深 / 浅色，图表随主题联动。
8. **云同步**：社交账号登录后选择上传本机数据、使用云端数据或暂时仅存本机；顶部状态会显示同步、离线或冲突状态。

## 设计文档

完整设计见 [`docs/README.md`](./docs/README.md)：需求、数据模型、核心算法、界面交互、技术架构、实施计划。

## 当前状态

✅ M0~M6、Cloudflare 工程骨架、社交账号认证、加密云端快照与 revision 冲突处理均已实现。里程碑详情见 [`docs/06-实施计划与里程碑.md`](./docs/06-实施计划与里程碑.md) 与 [`docs/14-云端数据存储与冲突处理实施.md`](./docs/14-云端数据存储与冲突处理实施.md)。
