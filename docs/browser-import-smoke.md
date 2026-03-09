# 页面级导入/撤销 smoke（零新增依赖）

本项目当前**不引入 Playwright**。页面级 smoke 使用：
- 本地 `vite preview`
- OpenClaw `browser` 工具
- 仓库内的测试备份生成脚本 `scripts/browser-import-smoke.mjs`

这样可以重复执行真实浏览器闭环，同时避免新增尚未充分验证的依赖。

## 目标闭环

验证以下真实 UI 路径：
1. 打开预览站点
2. 打开“账户管理”
3. 点击“导入当前账户”
4. 上传 `tmp-browser-import-current.json`
5. 检查 sanitize 后确认摘要与“当前账户事件规则 diff”
6. 输入 `导入当前账户` 并确认
7. 再次打开“账户管理”并检查“撤销上次导入 / 恢复”入口
8. 点击撤销，输入确认并完成回滚
9. 检查 localStorage 已恢复到初始默认账户状态

## 准备

在仓库根目录执行：

```bash
npm run build
node scripts/browser-import-smoke.mjs
npm run preview -- --host 127.0.0.1 --port 4175
```

其中：
- `node scripts/browser-import-smoke.mjs` 只负责生成测试备份文件，并输出文件路径
- `vite preview` 提供真实预览站点

## 用 OpenClaw browser 执行

推荐顺序：

1. `browser open` 打开 `http://127.0.0.1:4175/`
2. 在页面执行：
   - `localStorage.setItem('futureMoney.onboarding.v3', '1')`
   - 刷新页面
3. 点击“账户管理” → “导入当前账户”
4. 上传仓库根目录下的 `tmp-browser-import-current.json`
5. 断言确认框包含：
   - `当前账户事件规则 diff`
   - `将新增：导入工资、导入房租`
   - `导入后事件 / 对账 / 账本：2 / 1 / 1`
6. 输入 `导入当前账户`，点击“确认导入”
7. 再次进入“账户管理”，断言包含：
   - `撤销上次导入 / 恢复`
   - `导入当前账户 · tmp-browser-import-current.json`
8. 点击“撤销上次导入”，在确认框中点击“确认撤销”
9. 在页面执行：

```js
JSON.parse(window.localStorage.getItem('futureMoney.state') ?? 'null')
```

期望：
- 当前账户名为 `我的账户`
- 不再包含 `导入工资` / `导入房租`
- `futureMoney.rollback` 为 `null`

## 清理

验证结束后删除临时备份：

```bash
rm -f tmp-browser-import-current.json
```

## 说明

- 这是**真实浏览器 smoke 手册**，不是单元测试替代品。
- 自动化主闭环仍以 `npm test`、`npm run type-check`、`npm run build`、`npm run smoke` 为准。
- 页面级 smoke 目前采用“浏览器工具 + 仓库内测试夹具”的轻量方案，后续若要引入 Playwright，需要单独评估依赖、安装成本与 CI/本地稳定性。
