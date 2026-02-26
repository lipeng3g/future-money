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
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      borderColor: 'rgba(255, 255, 255, 0.5)',
      borderWidth: 1,
      padding: 0,
      extraCssText: 'backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: 0 12px 24px -4px rgba(15, 23, 42, 0.08); border-radius: 12px;',
      textStyle: {
        color: '#0f172a',
      },
      axisPointer: {
        type: 'shadow',
        shadowStyle: { color: 'rgba(15, 23, 42, 0.03)' },
      },
      formatter: (params: any) => {
        const month = params[0].axisValue;
        const income = params.find((p: any) => p.seriesName === '收入')?.value || 0;
        const expense = params.find((p: any) => p.seriesName === '支出')?.value || 0;
        const net = params.find((p: any) => p.seriesName === '结余')?.value || 0;
        const netColor = net >= 0 ? '#10b981' : '#f43f5e';

        return `
          <div style="padding:16px;min-width:180px">
            <div style="font-weight:600;margin-bottom:12px;font-size:13px;color:#64748b;border-bottom:1px solid rgba(15,23,42,0.06);padding-bottom:8px">${month}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <span style="color:#64748b;font-size:13px;display:flex;align-items:center;">
                <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#10b981;margin-right:8px;"></span>收入
              </span>
              <span style="font-family:'SF Pro Rounded', ui-monospace, sans-serif;font-weight:600;color:#0f172a;">¥${income.toLocaleString()}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              <span style="color:#64748b;font-size:13px;display:flex;align-items:center;">
                <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#f43f5e;margin-right:8px;"></span>支出
              </span>
              <span style="font-family:'SF Pro Rounded', ui-monospace, sans-serif;font-weight:600;color:#0f172a;">¥${Math.abs(expense).toLocaleString()}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid rgba(15,23,42,0.06);">
              <span style="font-weight:600;color:${netColor};font-size:13px">结余</span>
              <strong style="color:${netColor};font-family:'SF Pro Rounded', ui-monospace, sans-serif;font-size:15px">¥${net.toLocaleString()}</strong>
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
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#94a3b8',
        margin: 12,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        formatter: (value: number) => {
          if (value >= 1000) {
            return `¥${(value / 1000).toFixed(0)}k`;
          }
          return `¥${value}`;
        },
        color: '#94a3b8',
        fontFamily: "'SF Pro Rounded', ui-monospace, sans-serif",
      },
      splitLine: {
        lineStyle: { color: 'rgba(15, 23, 42, 0.04)', type: 'dashed' },
      },
    },
    series: [
      {
        name: '收入',
        type: 'bar',
        stack: 'total',
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: '#34d399' }, { offset: 1, color: '#10b981' }]
          },
          borderRadius: [4, 4, 0, 0],
        },
        data: incomeData,
      },
      {
        name: '支出',
        type: 'bar',
        stack: 'total',
        barWidth: 16,
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 1, x2: 0, y2: 0,
            colorStops: [{ offset: 0, color: '#fb7185' }, { offset: 1, color: '#f43f5e' }]
          },
          borderRadius: [0, 0, 4, 4],
        },
        data: expenseData.map((v) => -v),
      },
      {
        name: '结余',
        type: 'line',
        symbolSize: 0,
        smooth: true,
        itemStyle: {
          color: '#4338ca',
          borderWidth: 2,
          borderColor: '#ffffff',
        },
        lineStyle: {
          width: 3,
          color: '#4338ca',
        },
        data: netData,
        z: 10,
      },
    ],
  };
});
</script>

<style scoped>
.chart-card {
  border: 1px solid var(--fm-border-subtle);
  border-radius: 16px;
  padding: 24px;
  background: var(--fm-surface);
  box-shadow: var(--fm-shadow-sm);
  transition: box-shadow 0.3s ease;
}

.chart-card:hover {
  box-shadow: var(--fm-shadow-md);
}

.chart-card h3 {
  margin: 0 0 20px;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--fm-text-primary);
}

.chart {
  height: 280px;
}
</style>
