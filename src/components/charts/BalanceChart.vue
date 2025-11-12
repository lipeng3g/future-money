<template>
  <div class="chart-card">
    <VChart :option="chartOption" autoresize class="chart" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DailySnapshot } from '@/types/timeline';

interface Props {
  timeline: DailySnapshot[];
  warningThreshold: number;
  chartType?: 'line' | 'area';
  showWeekends?: boolean;
}

const props = defineProps<Props>();

const chartOption = computed(() => {
  const labels = props.timeline.map((point) => point.date);
  const balances = props.timeline.map((point) => point.balance);
  const useArea = props.chartType !== 'line';

  const weekendAreas: Array<{ xAxis: string }[]> = [];
  if (props.showWeekends) {
    let startIndex: number | null = null;
    props.timeline.forEach((point, index) => {
      if (point.isWeekend) {
        if (startIndex === null) startIndex = index;
      } else if (startIndex !== null) {
        weekendAreas.push([{ xAxis: labels[startIndex] }, { xAxis: labels[index - 1] }]);
        startIndex = null;
      }
    });
    if (startIndex !== null) {
      weekendAreas.push([{ xAxis: labels[startIndex] }, { xAxis: labels[labels.length - 1] }]);
    }
  }

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: 'rgba(0, 0, 0, 0.1)',
      borderWidth: 1,
      textStyle: {
        color: '#374151',
      },
      formatter: (params: any) => {
        const point = props.timeline[params[0].dataIndex];
        const events = point.events
          .map((event) => {
            const sign = event.category === 'income' ? '+' : '-';
            const color = event.category === 'income' ? '#10b981' : '#ef4444';
            return `<div style="color:${color};margin-top:4px;font-size:13px">${event.name}: ${sign}¥${event.amount.toLocaleString('zh-CN')}</div>`;
          })
          .join('');
        return `
          <div style="padding:4px">
            <div style="font-weight:600;margin-bottom:4px">${point.date}</div>
            <div style="font-size:14px">余额：<strong>¥${point.balance.toLocaleString('zh-CN')}</strong></div>
            ${events}
          </div>
        `;
      },
    },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
      axisLabel: {
        formatter: (value: string) => value.slice(5),
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => {
          if (value >= 1000) {
            const kValue = value / 1000;
            // 如果是整数k，不显示小数
            if (kValue % 1 === 0) {
              return `¥${kValue}k`;
            }
            // 否则显示一位小数
            return `¥${kValue.toFixed(1)}k`;
          }
          return `¥${value}`;
        },
      },
    },
    grid: { left: 50, right: 16, top: 20, bottom: 40 },
    dataZoom: [
      { type: 'inside' },
      { type: 'slider', height: 20, bottom: 0 },
    ],
    series: [
      {
        type: 'line',
        data: balances,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: '#3b82f6',
          width: 2,
        },
        areaStyle: useArea
          ? {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(59, 130, 246, 0.2)' },
                  { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
                ],
              },
            }
          : undefined,
        markArea: weekendAreas.length
          ? {
              itemStyle: { color: 'rgba(226, 232, 240, 0.3)' },
              data: weekendAreas,
            }
          : undefined,
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            {
              yAxis: props.warningThreshold,
              lineStyle: {
                color: '#f59e0b',
                type: 'dashed',
                width: 2,
              },
              label: {
                formatter: '预警线',
                color: '#f59e0b',
                fontSize: 12,
                fontWeight: 600,
              },
            },
          ],
        },
      },
    ],
  };
});
</script>

<style scoped>
.chart-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  padding: 20px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.chart {
  height: 360px;
}
</style>
