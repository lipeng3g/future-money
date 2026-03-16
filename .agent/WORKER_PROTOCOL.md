# WORKER_PROTOCOL（worker 工作方式约束）

目标：让 worker 的产出对“人类 + 其它 AI”**可见、可审阅、可追溯**，并确保协同开发稳定进行。

---

## 0) 两套资料如何协同：workspace vs 仓库 `.agent/`

### 仓库内（必须可见，可协作，可提交）
- 位置：`.agent/*`
- 用途：所有协作者共享的**任务/进展/决策/验收标准**

### 宿主机 workspace 内（私有运行态，不保证可见）
- 位置：例如 `/root/.openclaw/workspace/*` 下的全局文件、OpenClaw 的 memory/prompt_archive 等
- 用途：运行记录、跨项目临时素材、定时检查策略等
- 规则：
  - 不得把 workspace 私有内容原样提交到仓库（可能混入其它项目内容/敏感信息）
  - 若 workspace 中出现对本项目“可公开协作”的信息，必须**提炼后**写入 `.agent/WORKLOG.md` 或 `.agent/DECISIONS.md`

> 结论：`.agent/` 是协作真相源；workspace 只当运行环境。

---

## 1) 每次定时/自动开启 worker 的强制启动流程（必须执行）

1. `git fetch --all --prune`
2. 在当前分支执行：`git pull --rebase`
3. 读取协作资料（顺序固定）：
   - `.agent/README.md`
   - `.agent/NEXT_TASK.md`
   - `.agent/WORKER_PROTOCOL.md`
   - `.agent/DECISIONS.md`（如存在）
4. 再读相关代码/测试，选择一个 **30–90 分钟可交付**的最小任务
5. 在 `.agent/NEXT_TASK.md` 标注“进行中”

若 pull 冲突/权限/网络异常，worker 必须停止开发，先在 `.agent/WORKLOG.md` 记录阻塞并请求人工处理。

---

## 2) 交付标准
- 必须有可验收结果（功能/修复/测试/文档皆可，但要可验证）
- 说明清楚：做了什么、为什么、怎么验收
- 在 `.agent/WORKLOG.md` 追加记录（含 commit/PR 链接）

---

## 3) 禁止
- 不得提交任何密钥/敏感信息（token/cookie/私钥/个人账号）
