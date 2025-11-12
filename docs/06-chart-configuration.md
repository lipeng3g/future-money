# 图表配置指南

## 概述
本文档说明如何使用 ECharts 实现余额走势图和现金流图表。

---

## 1. ECharts 集成

### 1.1 安装

```bash
npm install echarts vue-echarts
```

### 1.2 全局注册（main.ts）

```typescript
import { createApp } from 'vue';
import ECharts from 'vue-echarts';
import { use } from 'echarts/core';

// 按需导入 ECharts 组件
import {
  LineChart,
  BarChart
} from 'echarts/charts';

import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkPointComponent,
  LegendComponent
} from 'echarts/components';

import { CanvasRenderer } from 'echarts/renderers';

// 注册组件
use([
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkPointComponent,
  LegendComponent,
  CanvasRenderer
]);

const app = createApp(App);
app.component('v-chart', ECharts);
```

---

## 2. 余额走势图

### 2.1 组件实现

```vue
<!-- BalanceChart.vue -->
<template>
  <div class="balance-chart-container">
    <v-chart
      :option="chartOption"
      :style="{ height: '500px' }"
      autoresize
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useFinanceStore } from '@/stores/finance';
import type { EChartsOption } from 'echarts';

const store = useFinanceStore();

const chartOption = computed<EChartsOption>(() => {
  const timeline = store.timeline;
  const threshold = store.account.warningThreshold;

  // 准备数据
  const dates = timeline.map(d => formatDate(d.date));
  const balances = timeline.map(d => d.balance);

  return {
    title: {
      text: '未来余额走势',
      left: 'center'
    },

    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        return generateTooltip(params, timeline);
      }
    },

    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        formatter: (value: string) => {
          const date = new Date(value);
          return date.getDate() === 1
            ? `${date.getMonth() + 1}月`
            : '';
        }
      }
    },

    yAxis: {
      type: 'value',
      name: '余额 (¥)',
      axisLabel: {
        formatter: (value: number) =>
          `¥${(value / 1000).toFixed(1)}k`
      }
    },

    dataZoom: [
      {
        type: 'slider',
        start: 0,
        end: 100
      },
      {
        type: 'inside'
      }
    ],

    series: [
      {
        name: '余额',
        type: 'line',
        data: balances,
        smooth: true,
        areaStyle: { opacity: 0.3 },
        markLine: {
          data: [
            {
              yAxis: threshold,
              label: {
                formatter: `预警线: ¥${threshold.toLocaleString()}`
              },
              lineStyle: {
                color: '#ff4d4f',
                type: 'dashed'
              }
            }
          ]
        }
      }
    ]
  };
});

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function generateTooltip(params: any, timeline: any[]): string {
  const index = params[0].dataIndex;
  const day = timeline[index];

  let html = `<div style="padding: 8px;">`;
  html += `<strong>${formatDate(day.date)}</strong><br/>`;
  html += `余额: ¥${day.balance.toLocaleString()}<br/>`;

  if (day.events.length > 0) {
    html += `<div style="margin-top: 8px;">当日事件:</div>`;
    day.events.forEach((e: any) => {
      const sign = e.category === 'income' ? '+' : '-';
      const color = e.category === 'income' ? '#52c41a' : '#ff4d4f';
      html += `<div style="color: ${color};">${e.name}: ${sign}¥${e.amount}</div>`;
    });
  }

  html += `</div>`;
  return html;
}
</script>

<style scoped>
.balance-chart-container {
  background: white;
  padding: 16px;
  border-radius: 8px;
}
</style>
```

---

## 3. 现金流柱状图

### 3.1 组件实现

```vue
<!-- CashFlowChart.vue -->
<template>
  <div class="cashflow-chart-container">
    <v-chart
      :option="chartOption"
      :style="{ height: '400px' }"
      autoresize
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useFinanceStore } from '@/stores/finance';
import type { EChartsOption } from 'echarts';

const store = useFinanceStore();

const chartOption = computed<EChartsOption>(() => {
  const monthly = store.analytics.monthly;

  const months = monthly.map(m => m.month);
  const income = monthly.map(m => m.income);
  const expense = monthly.map(m => m.expense);

  return {
    title: {
      text: '月度收支对比',
      left: 'center'
    },

    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },

    legend: {
      data: ['收入', '支出'],
      top: 30
    },

    xAxis: {
      type: 'category',
      data: months
    },

    yAxis: {
      type: 'value',
      name: '金额 (¥)'
    },

    series: [
      {
        name: '收入',
        type: 'bar',
        data: income,
        itemStyle: { color: '#52c41a' }
      },
      {
        name: '支出',
        type: 'bar',
        data: expense,
        itemStyle: { color: '#ff4d4f' }
      }
    ]
  };
});
</script>

<style scoped>
.cashflow-chart-container {
  background: white;
  padding: 16px;
  border-radius: 8px;
  margin-top: 16px;
}
</style>
```

---

## 4. 颜色方案

### 4.1 余额状态颜色

根据余额与阈值的关系动态着色：

```typescript
function getBalanceColor(balance: number, threshold: number): string {
  if (balance >= threshold) return '#52c41a';      // 绿色：充足
  if (balance >= threshold * 0.5) return '#faad14'; // 橙色：警告
  return '#ff4d4f';                                 // 红色：危险
}
```

### 4.2 使用 visualMap

```typescript
visualMap: {
  show: false,
  dimension: 1,
  pieces: [
    { gt: threshold, color: '#52c41a' },
    { gte: threshold * 0.5, lte: threshold, color: '#faad14' },
    { lt: threshold * 0.5, color: '#ff4d4f' }
  ]
}
```

---

## 5. 图表交互

### 5.1 点击事件

```typescript
const chart = ref();

function handleChartClick(params: any) {
  console.log('点击日期:', params.name);
  console.log('余额:', params.value);
}
```

```vue
<template>
  <v-chart
    ref="chart"
    :option="chartOption"
    @click="handleChartClick"
  />
</template>
```

### 5.2 缩放和拖动

已在 dataZoom 中配置：
- slider：底部滑块
- inside：鼠标滚轮缩放，拖动平移

---

## 6. 响应式尺寸

使用 `autoresize` 属性：

```vue
<v-chart
  :option="chartOption"
  autoresize
/>
```

或手动监听窗口变化：

```typescript
import { onMounted, onUnmounted } from 'vue';

const chartRef = ref();

function handleResize() {
  chartRef.value?.resize();
}

onMounted(() => {
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
```

---

## 7. 性能优化

### 7.1 大数据量优化

数据点超过1000时，使用采样：

```typescript
series: [
  {
    type: 'line',
    data: balances,
    sampling: 'lttb',  // 降采样
    large: true,       // 大数据量优化
    largeThreshold: 1000
  }
]
```

### 7.2 按需加载

只导入需要的 ECharts 组件（已在第1节说明）。

---

## 8. 导出图表

```typescript
function exportChart() {
  const chart = chartRef.value;
  const url = chart.getDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: '#fff'
  });

  // 下载图片
  const a = document.createElement('a');
  a.href = url;
  a.download = 'balance-chart.png';
  a.click();
}
```

---

## 9. 常见问题

**Q: 图表不显示？**
- 检查容器是否有高度
- 检查数据是否正确
- 检查 ECharts 组件是否注册

**Q: 图表不响应式？**
- 添加 `autoresize` 属性
- 或手动调用 `chart.resize()`

**Q: Tooltip 显示不全？**
- 设置 `confine: true` 限制在容器内

```typescript
tooltip: {
  confine: true
}
```

---

完成！图表配置指南已准备好。
