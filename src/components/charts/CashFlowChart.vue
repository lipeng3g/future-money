<template>
  <div class="chart-card">
    <h3>月度收支</h3>
    <VChart :option="chartOption" autoresize class="chart" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MonthlySnapshot } from '@/types/analytics';

const props = defineProps<{ months: MonthlySnapshot[] }>();

const chartOption = computed(() => {
  const labels = props.months.map((month) => month.monthLabel);
  const incomeData = props.months.map((month) => month.income);
  const expenseData = props.months.map((month) => month.expense);
  const netData = props.months.map((month) => month.income - month.expense);

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: 'rgba(0, 0, 0, 0.1)',
      borderWidth: 1,
      textStyle: {
        color: '#374151',
      },
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => {
        const month = params[0].axisValue;
        const income = params.find((p: any) => p.seriesName === '收入')?.value || 0;
        const expense = params.find((p: any) => p.seriesName === '支出')?.value || 0;
        const net = params.find((p: any) => p.seriesName === '结余')?.value || 0;

        return `
          <div style="padding:6px">
            <div style="font-weight:600;margin-bottom:6px">${month}</div>
            <div style="color:#10b981;margin-top:2px">
              <span style="display:inline-block;width:6px;height:6px;border-radius:999px;background:#10b981;margin-right:4px;"></span>
              收入: ¥${income.toLocaleString()}
            </div>
            <div style="color:#f43f5e;margin-top:2px">
              <span style="display:inline-block;width:6px;height:6px;border-radius:999px;background:#f43f5e;margin-right:4px;"></span>
              支出: ¥${expense.toLocaleString()}
            </div>
            <div style="margin-top:6px;padding-top:6px;border-top:1px solid #e5e7eb;font-weight:600;color:${net >= 0 ? '#10b981' : '#f43f5e'}">
              结余: <span style="color:${net >= 0 ? '#10b981' : '#f43f5e'}">¥${net.toLocaleString()}</span>
            </div>
          </div>
        `;
      },
    },
    legend: {
      data: ['收入', '支出', '结余'],
      top: 8,
      textStyle: {
        fontSize: 13,
      },
    },
    grid: { left: 50, right: 12, top: 48, bottom: 30 },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: {
        lineStyle: { color: '#e5e7eb' },
      },
      axisLabel: {
        color: '#6b7280',
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => {
          if (value >= 1000) {
            return `¥${(value / 1000).toFixed(0)}k`;
          }
          return `¥${value}`;
        },
        color: '#6b7280',
      },
      splitLine: {
        lineStyle: { color: '#f1f5f9', type: 'dashed' },
      },
    },
    series: [
      {
        name: '收入',
        type: 'bar',
        stack: 'total',
        itemStyle: {
          color: '#10b981',
        },
        data: incomeData,
      },
      {
        name: '支出',
        type: 'bar',
        stack: 'total',
        itemStyle: {
          color: '#f43f5e',
        },
        data: expenseData.map(v => -v), // 负值显示在下方
      },
      {
        name: '结余',
        type: 'line',
        symbolSize: 8,
        itemStyle: {
          color: '#2563eb',
          borderWidth: 2,
          borderColor: '#ffffff',
        },
        lineStyle: {
          width: 2,
          color: '#2563eb',
        },
        data: netData,
        z: 10, // 确保线在柱子上方
      },
    ],
  };
});
</script>

<style scoped>
.chart-card {
  border: 1px solid var(--fm-border-subtle);
  border-radius: 12px;
  padding: 20px;
  background: var(--fm-surface);
  box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.05);
}

.chart-card h3 {
  margin: 0 0 16px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--fm-text-primary);
}

.chart {
  height: 260px;
}
</style>
