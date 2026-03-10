import type { DailySnapshot, EventOccurrence } from '@/types/timeline';
import { getAdaptiveAxisLabelInterval, shouldDisableChartAnimation } from '@/utils/chart-base';
import { escapeHtml } from '@/utils/escape-html';
import { sanitizeHexColor } from '@/utils/color';

const DEFAULT_BALANCE_LABEL_TARGET = 10;
const DEFAULT_BALANCE_FOCUS_WINDOW = 60;

export type BalanceChartFocusKey = 'latest' | 'today' | 'warning' | 'min' | 'max' | 'reconciliation';

export interface BalanceChartFocusTarget {
  key: BalanceChartFocusKey;
  label: string;
  date: string;
}

export interface BalanceChartFocusInsight {
  key: BalanceChartFocusKey;
  label: string;
  date: string;
  balance: number;
  summary: string;
  detail: string;
  tone: 'info' | 'warning' | 'success';
  eventSummary?: string;
}

export interface BalanceChartTooltipAccountSummary {
  key: string;
  label: string;
  color?: string;
  income: number;
  expense: number;
  netChange: number;
  balanceAfter?: number;
  eventCount: number;
}

export const buildBalanceChartFocusTargets = (
  timeline: DailySnapshot[],
  warningThreshold: number,
  reconciliationDate?: string,
): BalanceChartFocusTarget[] => {
  if (!timeline.length) return [];

  const firstWarning = timeline.find((point) => point.balance < warningThreshold)?.date;
  const today = timeline.find((point) => point.isToday)?.date;
  const minPoint = timeline.reduce((lowest, point) => (
    point.balance < lowest.balance ? point : lowest
  ), timeline[0]);
  const maxPoint = timeline.reduce((highest, point) => (
    point.balance > highest.balance ? point : highest
  ), timeline[0]);
  const latest = timeline.at(-1)?.date;

  return [
    latest ? { key: 'latest', label: '最新区间', date: latest } : null,
    today ? { key: 'today', label: '今天', date: today } : null,
    firstWarning ? { key: 'warning', label: '首次预警', date: firstWarning } : null,
    minPoint?.date ? { key: 'min', label: '最低点', date: minPoint.date } : null,
    maxPoint?.date ? { key: 'max', label: '最高点', date: maxPoint.date } : null,
    reconciliationDate && timeline.some((point) => point.date === reconciliationDate)
      ? { key: 'reconciliation', label: '最近对账', date: reconciliationDate }
      : null,
  ].filter((item): item is BalanceChartFocusTarget => Boolean(item));
};

export const getDefaultBalanceChartFocusKey = (
  timeline: DailySnapshot[],
  warningThreshold: number,
  reconciliationDate?: string,
): BalanceChartFocusKey | undefined => {
  if (!timeline.length) return undefined;

  if (timeline.some((point) => point.balance < warningThreshold)) {
    return 'warning';
  }

  if (timeline.some((point) => point.isToday)) {
    return 'today';
  }

  if (reconciliationDate && timeline.some((point) => point.date === reconciliationDate)) {
    return 'reconciliation';
  }

  return 'latest';
};

export const getDefaultBalanceChartFocusDate = (
  timeline: DailySnapshot[],
  warningThreshold: number,
  reconciliationDate?: string,
): string | undefined => {
  const focusKey = getDefaultBalanceChartFocusKey(timeline, warningThreshold, reconciliationDate);
  if (!focusKey) return undefined;

  return buildBalanceChartFocusTargets(timeline, warningThreshold, reconciliationDate)
    .find((target) => target.key === focusKey)?.date;
};

export const getBalanceChartZoomWindow = (
  labels: string[],
  focusDate?: string,
  preferredWindowSize: number = DEFAULT_BALANCE_FOCUS_WINDOW,
): { startValue: number; endValue: number } | null => {
  if (!labels.length) return null;

  const focusIndex = focusDate ? labels.indexOf(focusDate) : labels.length - 1;
  const resolvedFocusIndex = focusIndex >= 0 ? focusIndex : labels.length - 1;
  const windowSize = Math.max(7, Math.min(preferredWindowSize, labels.length));

  if (labels.length <= windowSize) {
    return {
      startValue: 0,
      endValue: labels.length - 1,
    };
  }

  const leading = Math.floor(windowSize * 0.35);
  let startValue = Math.max(0, resolvedFocusIndex - leading);
  let endValue = startValue + windowSize - 1;

  if (endValue >= labels.length) {
    endValue = labels.length - 1;
    startValue = Math.max(0, endValue - windowSize + 1);
  }

  return { startValue, endValue };
};

const formatCurrency = (value: number) => `¥${value.toLocaleString('zh-CN')}`;

const formatDelta = (value: number) => {
  if (value === 0) return '较前一日持平';
  const prefix = value > 0 ? '较前一日增加' : '较前一日减少';
  return `${prefix}${formatCurrency(Math.abs(value))}`;
};

const buildEventSummary = (events: EventOccurrence[]) => {
  if (!events.length) return undefined;

  const topEvents = events.slice(0, 3).map((event) => {
    const sign = event.category === 'income' ? '+' : '-';
    return `${event.name} ${sign}${formatCurrency(event.amount)}`;
  });

  if (events.length > 3) {
    topEvents.push(`另有 ${events.length - 3} 笔事件`);
  }

  return `当日事件：${topEvents.join('；')}`;
};

export const buildBalanceChartFocusInsight = ({
  timeline,
  warningThreshold,
  focusKey,
  reconciliationDate,
  reconciliationBalance,
}: {
  timeline: DailySnapshot[];
  warningThreshold: number;
  focusKey: BalanceChartFocusKey;
  reconciliationDate?: string;
  reconciliationBalance?: number;
}): BalanceChartFocusInsight | null => {
  const target = buildBalanceChartFocusTargets(timeline, warningThreshold, reconciliationDate)
    .find((item) => item.key === focusKey);

  if (!target) return null;

  const pointIndex = timeline.findIndex((item) => item.date === target.date);
  const point = pointIndex >= 0 ? timeline[pointIndex] : undefined;
  if (!point) return null;

  const previousBalance = pointIndex > 0 ? timeline[pointIndex - 1]?.balance : undefined;
  const delta = previousBalance != null ? point.balance - previousBalance : point.change;
  const eventSummary = buildEventSummary(point.events);

  switch (focusKey) {
    case 'warning': {
      const deficit = Math.max(0, warningThreshold - point.balance);
      return {
        key: focusKey,
        label: target.label,
        date: target.date,
        balance: point.balance,
        tone: 'warning',
        summary: `${target.date} 首次跌破预警线，余额降到 ${formatCurrency(point.balance)}。`,
        detail: deficit > 0
          ? `比你的安全线少 ${formatCurrency(deficit)}，${formatDelta(delta)}。`
          : formatDelta(delta),
        eventSummary,
      };
    }
    case 'min': {
      const distance = point.balance - warningThreshold;
      return {
        key: focusKey,
        label: target.label,
        date: target.date,
        balance: point.balance,
        tone: distance < 0 ? 'warning' : 'info',
        summary: `${target.date} 是当前视图的最低余额点：${formatCurrency(point.balance)}。`,
        detail: distance < 0
          ? `低于预警线 ${formatCurrency(Math.abs(distance))}，${formatDelta(delta)}。`
          : `仍高于预警线 ${formatCurrency(distance)}，${formatDelta(delta)}。`,
        eventSummary,
      };
    }
    case 'max': {
      return {
        key: focusKey,
        label: target.label,
        date: target.date,
        balance: point.balance,
        tone: 'success',
        summary: `${target.date} 达到当前视图最高余额 ${formatCurrency(point.balance)}。`,
        detail: `${formatDelta(delta)}，适合回看是哪几笔收入把余额抬上来。`,
        eventSummary,
      };
    }
    case 'reconciliation': {
      return {
        key: focusKey,
        label: target.label,
        date: target.date,
        balance: point.balance,
        tone: 'info',
        summary: `${target.date} 是最近一次对账锚点，图表从这里衔接真实余额与后续预测。`,
        detail: reconciliationBalance != null
          ? `对账余额记录为 ${formatCurrency(reconciliationBalance)}。`
          : `当前图上余额为 ${formatCurrency(point.balance)}。`,
        eventSummary,
      };
    }
    case 'today': {
      return {
        key: focusKey,
        label: target.label,
        date: target.date,
        balance: point.balance,
        tone: point.balance < warningThreshold ? 'warning' : 'info',
        summary: `${target.date} 是今天所在位置，当前余额为 ${formatCurrency(point.balance)}。`,
        detail: point.balance < warningThreshold
          ? `已经低于预警线 ${formatCurrency(warningThreshold - point.balance)}，建议优先看接下来几笔支出。`
          : `${formatDelta(delta)}。`,
        eventSummary,
      };
    }
    case 'latest':
    default: {
      return {
        key: focusKey,
        label: target.label,
        date: target.date,
        balance: point.balance,
        tone: point.balance < warningThreshold ? 'warning' : 'info',
        summary: `${target.date} 是当前预测区间终点，期末余额预计为 ${formatCurrency(point.balance)}。`,
        detail: point.balance < warningThreshold
          ? `低于预警线 ${formatCurrency(warningThreshold - point.balance)}，需要提前准备补位资金。`
          : `${formatDelta(delta)}。`,
        eventSummary,
      };
    }
  }
};

export const buildBalanceChartTooltipAccountSummaries = (
  point: DailySnapshot,
  accountLabels?: Record<string, { name: string; color?: string }>,
): BalanceChartTooltipAccountSummary[] => {
  if (!point.events.length) return [];

  const hasMultipleAccounts = point.events.some((event) => event.accountId);
  if (!hasMultipleAccounts) return [];

  const grouped = new Map<string, EventOccurrence[]>();
  point.events.forEach((event) => {
    const accountKey = event.accountId?.trim() || '__unknown__';
    const bucket = grouped.get(accountKey) ?? [];
    bucket.push(event);
    grouped.set(accountKey, bucket);
  });

  const sortedGroups = Array.from(grouped.entries())
    .map(([accountKey, events]) => {
      const income = events
        .filter((event) => event.category === 'income')
        .reduce((sum, event) => sum + event.amount, 0);
      const expense = events
        .filter((event) => event.category === 'expense')
        .reduce((sum, event) => sum + event.amount, 0);
      const netChange = income - expense;
      const accountMeta = accountKey === '__unknown__' ? undefined : accountLabels?.[accountKey];

      return {
        key: accountKey,
        label: accountKey === '__unknown__' ? '未标记账户' : accountMeta?.name ?? `账户 ${accountKey}`,
        color: accountMeta?.color,
        income,
        expense,
        netChange,
        eventCount: events.length,
      };
    })
    .sort((left, right) => {
      const netDelta = Math.abs(right.netChange) - Math.abs(left.netChange);
      if (netDelta !== 0) return netDelta;
      const expenseDelta = right.expense - left.expense;
      if (expenseDelta !== 0) return expenseDelta;
      return left.label.localeCompare(right.label, 'zh-CN');
    });

  let runningBalance = point.balance;
  return sortedGroups.map((group) => {
    const balanceAfter = runningBalance;
    runningBalance -= group.netChange;
    return {
      ...group,
      balanceAfter,
    };
  });
};

export const buildBalanceChartOption = ({
  timeline,
  warningThreshold,
  chartType = 'area',
  showWeekends = false,
  reconciliationDate,
  reconciliationBalance,
  focusDate,
  accountLabels,
}: {
  timeline: DailySnapshot[];
  warningThreshold: number;
  chartType?: 'line' | 'area';
  showWeekends?: boolean;
  reconciliationDate?: string;
  reconciliationBalance?: number;
  focusDate?: string;
  accountLabels?: Record<string, { name: string; color?: string }>;
}) => {
  const labels = timeline.map((point) => point.date);
  const useArea = chartType !== 'line';
  const axisLabelInterval = getAdaptiveAxisLabelInterval(labels.length, DEFAULT_BALANCE_LABEL_TARGET);
  const animation = !shouldDisableChartAnimation(labels.length);
  const zoomWindow = getBalanceChartZoomWindow(labels, focusDate);

  const weekendAreas: Array<{ xAxis: string }[]> = [];
  if (showWeekends) {
    let startIndex: number | null = null;
    timeline.forEach((point, index) => {
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

  const frozenData: (number | null)[] = [];
  const projectedData: (number | null)[] = [];
  let lastFrozenIndex = -1;

  timeline.forEach((point, index) => {
    if (point.zone === 'frozen') {
      frozenData.push(point.balance);
      projectedData.push(null);
      lastFrozenIndex = index;
    } else {
      frozenData.push(null);
      projectedData.push(point.balance);
    }
  });

  if (lastFrozenIndex >= 0 && lastFrozenIndex + 1 < timeline.length) {
    projectedData[lastFrozenIndex] = frozenData[lastFrozenIndex];
  }

  const hasFrozenData = frozenData.some((v) => v !== null);

  const changeInfo = timeline.map((point) => {
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
    return '#f59e0b';
  };

  const baseOption: any = {
    animation,
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
        const point = timeline[dataIndex];
        if (!point) return '';
        const zoneLabel = point.zone === 'frozen'
          ? '<span style="color:#64748b;font-size:12px;font-weight:500">已对账</span>'
          : '<span style="color:#4338ca;font-size:12px;font-weight:500">预测</span>';

        const events = point.events
          .map((event) => {
            const sign = event.category === 'income' ? '+' : '-';
            const color = event.category === 'income' ? '#10b981' : '#f43f5e';
            const safeName = escapeHtml(event.name);
            return `<div style="color:${color};margin-top:6px;font-size:13px;font-weight:500;display:flex;justify-content:space-between;gap:12px;"><span>${safeName}</span><span>${sign}¥${event.amount.toLocaleString('zh-CN')}</span></div>`;
          })
          .join('');

        const accountSummaries = buildBalanceChartTooltipAccountSummaries(point, accountLabels)
          .map((group) => {
            const signedNet = `${group.netChange >= 0 ? '+' : '-'}¥${Math.abs(group.netChange).toLocaleString('zh-CN')}`;
            const parts = [
              `${group.eventCount} 笔`,
              `净变动 ${signedNet}`,
              `落点 ¥${(group.balanceAfter ?? point.balance).toLocaleString('zh-CN')}`,
            ];
            if (group.income > 0) parts.push(`收入 ¥${group.income.toLocaleString('zh-CN')}`);
            if (group.expense > 0) parts.push(`支出 ¥${group.expense.toLocaleString('zh-CN')}`);

            const safeLabel = escapeHtml(group.label);
            const safeColor = sanitizeHexColor(group.color);
            const dot = safeColor
              ? `<span style="display:inline-flex;width:8px;height:8px;border-radius:999px;background:${safeColor};margin-right:6px;flex-shrink:0;"></span>`
              : '';

            return `<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(15,23,42,0.06);"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center;font-size:12px;font-weight:600;color:#334155;"><span style="display:inline-flex;align-items:center;">${dot}${safeLabel}</span><span>${escapeHtml(parts.join(' · '))}</span></div></div>`;
          })
          .join('');
        return `
          <div style="padding:16px;min-width:180px;max-width:320px">
            <div style="font-weight:600;margin-bottom:8px;font-size:13px;display:flex;justify-content:space-between;"><span>${escapeHtml(point.date)}</span> ${zoneLabel}</div>
            <div style="font-size:16px;margin-bottom:8px;border-bottom:1px solid rgba(15,23,42,0.06);padding-bottom:12px">余额：<strong style="font-family:'SF Pro Rounded', ui-monospace, sans-serif;">¥${point.balance.toLocaleString('zh-CN')}</strong></div>
            ${events}
            ${accountSummaries}
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
        interval: axisLabelInterval,
        hideOverlap: true,
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
    dataZoom: labels.length
      ? [
          {
            type: 'inside',
            filterMode: 'none',
            startValue: zoomWindow?.startValue ?? 0,
            endValue: zoomWindow?.endValue ?? Math.max(0, labels.length - 1),
          },
          {
            type: 'slider',
            height: 20,
            bottom: 0,
            filterMode: 'none',
            startValue: zoomWindow?.startValue ?? 0,
            endValue: zoomWindow?.endValue ?? Math.max(0, labels.length - 1),
          },
        ]
      : [],
  };

  const markLineData: any[] = [
    {
      yAxis: warningThreshold,
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

  if (reconciliationDate) {
    markLineData.push({
      xAxis: reconciliationDate,
      lineStyle: {
        color: '#4f46e5',
        type: 'dotted',
        width: 1.5,
      },
      label: {
        formatter: () =>
          reconciliationBalance != null
            ? `对账：¥${reconciliationBalance.toLocaleString('zh-CN')}`
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
};


export { getAdaptiveAxisLabelInterval, shouldDisableChartAnimation } from '@/utils/chart-base';
export { buildCashFlowChartOption } from '@/utils/chart-options-cashflow';
