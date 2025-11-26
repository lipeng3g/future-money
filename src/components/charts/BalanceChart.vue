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
  snapshotDate?: string;
  snapshotBalance?: number;
  /** 是否处于历史快照视图 */
  isHistorical?: boolean;
}

const props = defineProps<Props>();

const chartOption = computed(() => {
  const labels = props.timeline.map((point) => point.date);
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

  const lineData = props.timeline.map((point) => point.balance);
  const isHistorical = !!props.isHistorical;

  const baseOption: any = {
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
            const color = event.category === 'income' ? '#10b981' : '#f43f5e';
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
      axisLine: {
        lineStyle: { color: '#e5e7eb' },
      },
      axisLabel: {
        formatter: (value: string) => value.slice(5),
        color: '#64748b',
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
        color: '#64748b',
      },
      splitLine: {
        lineStyle: {
          color: '#f1f5f9',
          type: 'dashed',
        },
      },
    },
    grid: { left: 50, right: 16, top: 20, bottom: 40 },
    dataZoom: [
      { type: 'inside' },
      { type: 'slider', height: 20, bottom: 0 },
    ],
  };

  // 公共的预警线 + 校准线配置
  const commonMarkLine = {
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
      ...(props.snapshotDate
        ? [
            {
              xAxis: props.snapshotDate,
              lineStyle: {
                color: '#6b7280',
                type: 'dotted',
                width: 1,
              },
              label: {
                formatter: () =>
                  props.snapshotBalance != null
                    ? `校准：¥${props.snapshotBalance.toLocaleString('zh-CN')}`
                    : '最近校准',
                color: '#6b7280',
                fontSize: 11,
              },
            } as any,
          ]
        : []),
    ],
  };

  // 单条连续余额曲线：根据是否为历史视图调整配色
  const lineColor = isHistorical ? '#94a3b8' : '#2563eb';
  const areaStyle = useArea && !isHistorical
    ? {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(37, 99, 235, 0.20)' },
            { offset: 1, color: 'rgba(37, 99, 235, 0.03)' },
          ],
        },
      }
    : undefined;

  baseOption.series = [
    {
      type: 'line',
      data: lineData,
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: {
        color: lineColor,
        width: 2,
      },
      itemStyle: {
        color: lineColor,
        borderColor: '#ffffff',
        borderWidth: 2,
      },
      areaStyle,
      markArea: weekendAreas.length
        ? {
            itemStyle: { color: 'rgba(226, 232, 240, 0.3)' },
            data: weekendAreas,
          }
        : undefined,
      markLine: commonMarkLine,
    },
  ];

  return baseOption;
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

.chart {
  height: 360px;
}
</style>
