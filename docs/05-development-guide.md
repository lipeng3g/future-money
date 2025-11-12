# 技术栈与开发指南

## 1. 技术栈选型

### 1.1 核心框架
- **Vue 3.4+**：使用 Composition API
- **TypeScript 5.0+**：类型安全
- **Vite 5.0+**：构建工具

### 1.2 UI 组件库
- **Ant Design Vue 4.x**：完整的企业级 UI 组件

### 1.3 图表库
- **ECharts 5.5+**：功能强大的图表库
- **vue-echarts**：Vue 3 的 ECharts 封装

### 1.4 状态管理
- **Pinia 2.1+**：Vue 3 官方推荐的状态管理

### 1.5 工具库
- **date-fns 3.0+**：日期处理（轻量级）

### 1.6 代码质量
- **ESLint**：代码检查
- **Prettier**：代码格式化

---

## 2. 项目初始化

### 2.1 创建项目

```bash
# 使用 Vite 创建 Vue 3 + TypeScript 项目
npm create vite@latest future-money -- --template vue-ts

cd future-money
npm install
```

### 2.2 安装依赖

```bash
# UI 组件库
npm install ant-design-vue

# 图表库
npm install echarts vue-echarts

# 状态管理
npm install pinia

# 日期处理
npm install date-fns

# 类型定义
npm install -D @types/node
```

### 2.3 配置 Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000
  }
});
```

### 2.4 配置 TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## 3. 项目结构

```
future-money/
├── public/              # 静态资源
├── src/
│   ├── assets/          # 资源文件
│   │   └── styles/      # 全局样式
│   ├── components/      # 公共组件
│   │   ├── EventCard.vue
│   │   ├── EventList.vue
│   │   ├── EventFormModal.vue
│   │   ├── BalanceChart.vue
│   │   └── CashFlowChart.vue
│   ├── layouts/         # 布局组件
│   │   ├── AppHeader.vue
│   │   └── MainLayout.vue
│   ├── stores/          # Pinia 状态管理
│   │   └── finance.ts
│   ├── types/           # TypeScript 类型定义
│   │   ├── index.ts
│   │   ├── event.ts
│   │   ├── account.ts
│   │   └── analytics.ts
│   ├── utils/           # 工具函数
│   │   ├── timeline.ts        # 时间轴生成器
│   │   ├── analytics.ts       # 数据分析引擎
│   │   ├── storage.ts         # 存储管理
│   │   └── validators.ts      # 验证函数
│   ├── App.vue          # 根组件
│   └── main.ts          # 入口文件
├── docs/                # 文档目录
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 4. 入口文件配置

### 4.1 main.ts

```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import App from './App.vue';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(Antd);

app.mount('#app');
```

### 4.2 App.vue

```vue
<template>
  <div id="app">
    <AppHeader />
    <MainLayout />
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/layouts/AppHeader.vue';
import MainLayout from '@/layouts/MainLayout.vue';
</script>

<style>
#app {
  min-width: 1024px;
  height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
```

---

## 5. 开发规范

### 5.1 命名规范

- **文件名**：PascalCase（如 `EventCard.vue`）
- **组件名**：PascalCase
- **变量/函数**：camelCase
- **常量**：UPPER_SNAKE_CASE
- **类型/接口**：PascalCase

### 5.2 Vue 组件规范

使用 `<script setup>` 语法：

```vue
<template>
  <div class="event-card">
    <h3>{{ event.name }}</h3>
    <p>{{ formattedAmount }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CashFlowEvent } from '@/types';

interface Props {
  event: CashFlowEvent;
}

const props = defineProps<Props>();

const formattedAmount = computed(() => {
  const sign = props.event.category === 'income' ? '+' : '-';
  return `${sign}¥${props.event.amount.toLocaleString()}`;
});
</script>

<style scoped>
.event-card {
  padding: 16px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
}
</style>
```

### 5.3 TypeScript 使用

- 所有函数参数和返回值都要标注类型
- 使用 interface 定义对象类型
- 使用 type 定义联合类型
- 避免使用 any

---

## 6. 开发流程

### 6.1 启动开发服务器

```bash
npm run dev
```

访问：http://localhost:3000

### 6.2 构建生产版本

```bash
npm run build
```

输出目录：`dist/`

### 6.3 预览生产版本

```bash
npm run preview
```

---

## 7. Git 提交规范

使用 Conventional Commits：

```
feat: 添加事件管理功能
fix: 修复余额计算错误
docs: 更新开发文档
style: 代码格式化
refactor: 重构时间轴生成器
test: 添加单元测试
chore: 更新依赖
```

---

## 8. 开发任务清单

### 阶段一：基础框架
- [ ] 初始化项目
- [ ] 配置开发环境
- [ ] 创建目录结构
- [ ] 搭建基础布局

### 阶段二：数据层
- [ ] 定义 TypeScript 类型
- [ ] 实现 TimelineGenerator
- [ ] 实现 AnalyticsEngine
- [ ] 实现 StorageManager
- [ ] 创建 Pinia Store

### 阶段三：UI 组件
- [ ] AppHeader 组件
- [ ] EventList 组件
- [ ] EventCard 组件
- [ ] EventFormModal 组件

### 阶段四：图表
- [ ] BalanceChart 组件
- [ ] CashFlowChart 组件
- [ ] 图表交互优化

### 阶段五：功能完善
- [ ] 导入/导出功能
- [ ] 数据验证
- [ ] 错误处理
- [ ] UI 细节优化

---

## 9. 常见问题

**Q: ECharts 图表不显示？**
A: 确保容器有明确的高度：
```css
.chart-container {
  width: 100%;
  height: 400px;
}
```

**Q: localStorage 数据丢失？**
A: 检查是否在无痕模式，或存储空间已满。

**Q: 日期计算不准确？**
A: 使用 date-fns 而不是原生 Date 对象。

---

## 10. 调试技巧

### 10.1 Vue DevTools
安装 Vue DevTools 浏览器扩展，查看组件状态。

### 10.2 Pinia DevTools
在 Vue DevTools 中查看 Pinia store 状态。

### 10.3 ECharts Debug
```typescript
chart.on('click', (params) => {
  console.log('图表点击:', params);
});
```

---

## 11. 性能优化

- 使用 `computed` 缓存计算结果
- 大列表使用虚拟滚动
- 图表数据按需加载
- 合理使用 `v-show` vs `v-if`

---

## 12. 部署建议

### 静态托管平台
- Vercel
- Netlify
- GitHub Pages

### 部署步骤
```bash
npm run build
# 将 dist/ 目录上传到托管平台
```

---

完成！所有开发指南已准备好。
