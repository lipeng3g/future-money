# FutureMoney 设计文档

## 文档导航

本目录包含 FutureMoney 项目的完整设计文档，用于指导开发工作。

---

## 📚 文档列表

### [01 - 项目概述](./01-project-overview.md)
- 项目简介和核心价值
- 功能范围和技术约束
- 开发里程碑和成功标准

### [02 - 数据模型设计](./02-data-models.md)
- 核心数据类型定义
- 现金流事件模型
- 数据验证规则
- TypeScript 类型定义

### [03 - 核心算法设计](./03-core-algorithms.md)
- 时间轴生成算法
- 事件匹配逻辑
- 数据分析引擎
- 存储管理方案

### [04 - UI 组件架构](./04-ui-architecture.md)
- 整体布局设计
- 组件树结构
- 核心组件说明
- 状态管理方案

### [05 - 开发指南](./05-development-guide.md)
- 技术栈选型
- 项目初始化
- 开发规范
- 常见问题解答

### [06 - 图表配置指南](./06-chart-configuration.md)
- ECharts 集成
- 余额走势图配置
- 现金流柱状图配置
- 图表交互和优化

---

## 🚀 快速开始

1. 阅读 **[项目概述](./01-project-overview.md)** 了解项目背景
2. 学习 **[数据模型](./02-data-models.md)** 掌握数据结构
3. 参考 **[开发指南](./05-development-guide.md)** 开始编码

---

## 📋 开发顺序建议

### 阶段一：基础搭建
1. 按照 [开发指南](./05-development-guide.md) 初始化项目
2. 创建 [数据模型](./02-data-models.md) 中定义的 TypeScript 类型

### 阶段二：核心逻辑
1. 实现 [核心算法](./03-core-algorithms.md) 中的 TimelineGenerator
2. 实现 AnalyticsEngine 和 StorageManager
3. 创建 Pinia Store

### 阶段三：UI 开发
1. 参考 [UI 架构](./04-ui-architecture.md) 搭建布局
2. 开发事件管理组件
3. 集成 [图表组件](./06-chart-configuration.md)

### 阶段四：完善优化
1. 实现导入/导出功能
2. 添加数据验证
3. UI/UX 优化

---

## 💡 设计原则

1. **简单优先**：暂不实现标签、多账户、移动端
2. **桌面为主**：最小宽度 1024px
3. **数据本地**：使用 localStorage，支持导入/导出
4. **类型安全**：全面使用 TypeScript
5. **用户友好**：清晰的 UI 和流畅的交互

---

## 🔧 技术栈总结

```
前端框架：Vue 3 + Composition API
类型系统：TypeScript 5+
构建工具：Vite 5+
UI 组件：Ant Design Vue 4+
图表库：ECharts 5.5+
状态管理：Pinia 2+
日期处理：date-fns 3+
```

---

## 📞 开发支持

如有疑问，请参考对应文档或查看代码注释。

祝开发顺利！
