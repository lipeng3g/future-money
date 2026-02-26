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
  /** 最新对账日期 */
  reconciliationDate?: string;
  /** 最新对账余额 */
  reconciliationBalance?: number;
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

  // 分离冻结区和预测区数据
  const frozenData: (number | null)[] = [];
  const projectedData: (number | null)[] = [];
  let lastFrozenIndex = -1;

  props.timeline.forEach((point, index) => {
    if (point.zone === 'frozen') {
      frozenData.push(point.balance);
      projectedData.push(null);
      lastFrozenIndex = index;
    } else {
      frozenData.push(null);
      projectedData.push(point.balance);
    }
  });

  // 让预测区第一个点连接到冻结区最后一个点（视觉连续）
  if (lastFrozenIndex >= 0 && lastFrozenIndex + 1 < props.timeline.length) {
    projectedData[lastFrozenIndex] = frozenData[lastFrozenIndex];
  }

  const hasFrozenData = frozenData.some((v) => v !== null);

  // 构建每日变动信息，用于动态标记点
  const changeInfo = props.timeline.map((point) => {
    const hasIncome = point.events.some((e) => e.category === 'income');
    const hasExpense = point.events.some((e) => e.category === 'expense');
    return { hasEvent: point.events.length > 0, hasIncome, hasExpense };
  });

  const dynamicSymbolSize = (value: number | null, params: any) => {
    if (value == null) return 0;
    const info = changeInfo[params.dataIndex];
    return info?.hasEvent ? 8 : 0;
  };

  const dynamicItemColor = (params: any, fallback: string) => {
    const info = changeInfo[params.dataIndex];
    if (!info?.hasEvent) return fallback;
    if (info.hasIncome && !info.hasExpense) return '#10b981';
    if (info.hasExpense && !info.hasIncome) return '#f43f5e';
    return '#f59e0b'; // 同时有收支
  };

  const baseOption: any = {
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
      formatter: (params: any) => {
        const dataIndex = params[0]?.dataIndex;
        if (dataIndex == null) return '';
        const point = props.timeline[dataIndex];
        if (!point) return '';
        const zoneLabel = point.zone === 'frozen' ? '<span style="color:#64748b;font-size:12px;font-weight:500">已对账</span>' : '<span style="color:#4338ca;font-size:12px;font-weight:500">预测</span>';
        const events = point.events
          .map((event) => {
            const sign = event.category === 'income' ? '+' : '-';
            const color = event.category === 'income' ? '#10b981' : '#f43f5e';
            return `<div style="color:${color};margin-top:6px;font-size:13px;font-weight:500;display:flex;justify-content:space-between;gap:12px;"><span>${event.name}</span><span>${sign}¥${event.amount.toLocaleString('zh-CN')}</span></div>`;
          })
          .join('');
        return `
          <div style="padding:16px;min-width:180px">
            <div style="font-weight:600;margin-bottom:8px;font-size:13px;display:flex;justify-content:space-between;"><span>${point.date}</span> ${zoneLabel}</div>
            <div style="font-size:16px;margin-bottom:8px;border-bottom:1px solid rgba(15,23,42,0.06);padding-bottom:12px">余额：<strong style="font-family:'SF Pro Rounded', ui-monospace, sans-serif;">¥${point.balance.toLocaleString('zh-CN')}</strong></div>
            ${events}
          </div>
        `;
      },
    },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        formatter: (value: string) => value.slice(5),
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
            const kValue = value / 1000;
            if (kValue % 1 === 0) {
              return `¥${kValue}k`;
            }
            return `¥${kValue.toFixed(1)}k`;
          }
          return `¥${value}`;
        },
        color: '#94a3b8',
        fontFamily: "'SF Pro Rounded', ui-monospace, sans-serif",
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(15, 23, 42, 0.04)',
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

  // 标记线：预警线 + 对账点标记
  const markLineData: any[] = [
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
  ];

  // 对账日期标记线
  if (props.reconciliationDate) {
    markLineData.push({
      xAxis: props.reconciliationDate,
      lineStyle: {
        color: '#4f46e5',
        type: 'dotted',
        width: 1.5,
      },
      label: {
        formatter: () =>
          props.reconciliationBalance != null
            ? `对账：¥${props.reconciliationBalance.toLocaleString('zh-CN')}`
            : '最近对账',
        color: '#4f46e5',
        fontSize: 11,
      },
    } as any);
  }

  const commonMarkLine = {
    silent: true,
    symbol: 'none',
    data: markLineData,
  };

  const series: any[] = [];

  // 冻结区：实线 + 深色
  if (hasFrozenData) {
    series.push({
      type: 'line',
      data: frozenData,
      smooth: true,
      symbol: 'circle',
      symbolSize: (value: number | null, params: any) => dynamicSymbolSize(value, params),
      connectNulls: false,
      lineStyle: {
        color: '#0f172a',
        width: 3,
      },
      itemStyle: {
        color: (params: any) => dynamicItemColor(params, '#0f172a'),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
      areaStyle: useArea
        ? {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(15, 23, 42, 0.08)' },
                { offset: 1, color: 'rgba(15, 23, 42, 0.01)' },
              ],
            },
          }
        : undefined,
      markArea: weekendAreas.length
        ? {
            itemStyle: { color: 'rgba(15, 23, 42, 0.02)' },
            data: weekendAreas,
          }
        : undefined,
      markLine: commonMarkLine,
    });
  }

  // 预测区：虚线 + 浅色
  series.push({
    type: 'line',
    data: projectedData,
    smooth: true,
    symbol: 'circle',
    symbolSize: (value: number | null, params: any) => dynamicSymbolSize(value, params),
    connectNulls: false,
    lineStyle: {
      color: '#4338ca',
      width: 2.5,
      type: 'dashed',
    },
    itemStyle: {
      color: (params: any) => dynamicItemColor(params, '#4338ca'),
      borderColor: '#ffffff',
      borderWidth: 2,
    },
    areaStyle: useArea
      ? {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(67, 56, 202, 0.15)' },
              { offset: 1, color: 'rgba(67, 56, 202, 0.02)' },
            ],
          },
        }
      : undefined,
    markArea: !hasFrozenData && weekendAreas.length
      ? {
          itemStyle: { color: 'rgba(15, 23, 42, 0.02)' },
          data: weekendAreas,
        }
      : undefined,
    markLine: !hasFrozenData ? commonMarkLine : undefined,
  });

  baseOption.series = series;

  return baseOption;
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

.chart {
  height: 380px;
}
</style>
