<template>
  <div class="chart-card">
    <div v-if="!timeline.length" class="chart-empty-state">
      <strong>还没有可展示的余额走势</strong>
      <p>先完成一次对账或添加未来现金流事件，图表才会开始生成预测。</p>
    </div>
    <template v-else>
      <div v-if="focusButtons.length" class="chart-toolbar">
        <div class="toolbar-copy">
          <strong>快速定位</strong>
          <span>{{ activeFocusLabel }}</span>
        </div>
        <div class="focus-chip-list">
          <button
            v-for="button in focusButtons"
            :key="button.key"
            type="button"
            class="focus-chip"
            :class="{ active: button.key === activeFocusKey }"
            @click="activeFocusKey = button.key"
          >
            {{ button.label }}
          </button>
        </div>
      </div>

      <div v-if="activeInsight" class="focus-insight" :class="activeInsight.tone">
        <div class="focus-insight-header">
          <div>
            <strong>{{ activeInsight.label }}</strong>
            <span>{{ activeInsight.date }}</span>
          </div>
          <div class="focus-insight-actions">
            <button type="button" class="focus-insight-copy" @click="copyInsightSummary">复制摘要</button>
            <button
              v-if="activeFocusEvents.length"
              type="button"
              class="focus-insight-export"
              @click="downloadActiveFocusEventsCsv"
            >
              导出当日事件
            </button>
            <b>{{ formatCurrency(activeInsight.balance) }}</b>
          </div>
        </div>
        <p>{{ activeInsight.summary }}</p>
        <small>{{ activeInsight.detail }}</small>
        <small v-if="activeInsight.eventSummary" class="event-summary">{{ activeInsight.eventSummary }}</small>
        <div v-if="activeFocusEventGroups.length" class="focus-event-groups" aria-label="当前焦点日期事件摘要">
          <section
            v-for="group in activeFocusEventGroups"
            :key="group.key"
            class="focus-event-group"
          >
            <div class="focus-event-group-header">
              <strong class="focus-event-group-title">
                <span
                  v-if="group.color"
                  class="focus-event-group-dot"
                  :style="{ background: group.color }"
                ></span>
                {{ group.label }}
              </strong>
              <span>{{ group.summary }}</span>
            </div>
            <div class="focus-event-list">
              <button
                v-for="event in group.events"
                :key="event.id"
                type="button"
                class="focus-event-chip"
                @click="emit('select-date', event.date)"
              >
                <span class="event-chip-name">{{ event.name }}</span>
                <span class="event-chip-amount" :class="event.category">{{ formatSignedAmount(event.category, event.amount) }}</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      <VChart v-if="chartRuntimeReady" :option="chartOption" autoresize class="chart" @click="handleChartClick" />
      <ChartRuntimeErrorNotice
        v-else-if="chartRuntimeError && !dismissedRuntimeError"
        :message="chartRuntimeError"
        :action="chartRuntimeErrorAction"
        @retry="retryChartRuntime"
        @dismiss="dismissChartRuntimeError"
      />
      <div v-else class="chart-loading-state">正在加载图表引擎…</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { ECElementEvent } from 'echarts/core';
import VChart from 'vue-echarts';
import ChartRuntimeErrorNotice from '@/components/charts/ChartRuntimeErrorNotice.vue';
import type { DailySnapshot, EventOccurrence } from '@/types/timeline';
import { useChartRuntime } from '@/utils/use-chart-runtime';
import {
  buildBalanceChartFocusInsight,
  buildBalanceChartFocusTargets,
  buildBalanceChartOption,
  getDefaultBalanceChartFocusDate,
  getDefaultBalanceChartFocusKey,
  type BalanceChartFocusKey,
} from '@/utils/chart-options';

interface Props {
  timeline: DailySnapshot[];
  warningThreshold: number;
  chartType?: 'line' | 'area';
  showWeekends?: boolean;
  /** 最新对账日期 */
  reconciliationDate?: string;
  /** 最新对账余额 */
  reconciliationBalance?: number;
  /** 多账户视图下用于把 accountId 渲染成可读名称 */
  accountLabels?: Record<string, { name: string; color?: string }>;
  /** 外部联动指定图表焦点 */
  focusKey?: BalanceChartFocusKey;
  /** 外部联动指定图表日期 */
  focusDate?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'select-date', date: string): void;
}>();

const chartRuntime = useChartRuntime('balance', () => import('@/utils/echarts-balance'));
const chartRuntimeReady = chartRuntime.ready;
const chartRuntimeError = chartRuntime.error;
const chartRuntimeErrorAction = chartRuntime.errorAction;
const dismissedRuntimeError = ref(false);

const retryChartRuntime = async () => {
  dismissedRuntimeError.value = false;
  await chartRuntime.retry();
};

const dismissChartRuntimeError = () => {
  // 组件本地把错误横幅“收起”，避免用户在无网/限流时反复被挡住；
  // runtime 的真实状态仍保留在内部，后续重试会重新计算。
  dismissedRuntimeError.value = true;
};

const focusButtons = computed(() => buildBalanceChartFocusTargets(
  props.timeline,
  props.warningThreshold,
  props.reconciliationDate,
));

const activeFocusKey = ref<BalanceChartFocusKey>('latest');

watch(
  [focusButtons, () => props.focusKey, () => props.focusDate] as const,
  ([buttons, requestedFocusKey, requestedFocusDate]) => {
    const availableKeys = new Set(buttons.map((button) => button.key));

    if (requestedFocusDate && props.timeline.some((point) => point.date === requestedFocusDate)) {
      return;
    }

    if (requestedFocusKey && availableKeys.has(requestedFocusKey)) {
      activeFocusKey.value = requestedFocusKey;
      return;
    }

    const preferredKey = getDefaultBalanceChartFocusKey(
      props.timeline,
      props.warningThreshold,
      props.reconciliationDate,
    );
    const preferredDate = getDefaultBalanceChartFocusDate(
      props.timeline,
      props.warningThreshold,
      props.reconciliationDate,
    );
    const preferredButton = buttons.find((button) => button.key === preferredKey)
      ?? buttons.find((button) => button.date === preferredDate);

    if (preferredButton) {
      activeFocusKey.value = preferredButton.key;
      return;
    }

    if (!availableKeys.has(activeFocusKey.value)) {
      activeFocusKey.value = buttons[0]?.key ?? 'latest';
    }
  },
  { immediate: true },
);

const activeFocus = computed(() => {
  if (props.focusDate) {
    const matchedPoint = props.timeline.find((point) => point.date === props.focusDate);
    if (matchedPoint) {
      return {
        key: activeFocusKey.value,
        label: '定位日期',
        date: matchedPoint.date,
        isPinnedDate: true,
      };
    }
  }

  const fallbackFocus = focusButtons.value.find((button) => button.key === activeFocusKey.value) ?? focusButtons.value[0];
  if (!fallbackFocus) return undefined;
  return {
    ...fallbackFocus,
    isPinnedDate: false,
  };
});

const activeFocusLabel = computed(() => {
  if (!activeFocus.value) return '拖动下方时间窗查看不同阶段';
  return `${activeFocus.value.label} · ${activeFocus.value.date}`;
});

const activeInsight = computed(() => {
  if (!activeFocus.value) return null;

  if (activeFocus.value.isPinnedDate) {
    const pointIndex = props.timeline.findIndex((item) => item.date === props.focusDate);
    const point = pointIndex >= 0 ? props.timeline[pointIndex] : null;
    if (!point) return null;
    return {
      key: activeFocusKey.value,
      label: '定位日期',
      date: point.date,
      balance: point.balance,
      tone: point.balance < props.warningThreshold ? 'warning' : 'info',
      summary: `${point.date} 是当前选中事件在图表中的发生日期。`,
      detail: point.events.length
        ? `当天共有 ${point.events.length} 笔事件，余额变化 ${formatCurrency(point.change)}。`
        : `当天没有匹配到事件明细。`,
      eventSummary: point.events.length
        ? `当日事件：${point.events.slice(0, 3).map((event) => `${event.name} ${event.category === 'income' ? '+' : '-'}${formatCurrency(event.amount)}`).join('；')}${point.events.length > 3 ? `；另有 ${point.events.length - 3} 笔事件` : ''}`
        : undefined,
    };
  }

  return buildBalanceChartFocusInsight({
    timeline: props.timeline,
    warningThreshold: props.warningThreshold,
    focusKey: activeFocus.value.key,
    reconciliationDate: props.reconciliationDate,
    reconciliationBalance: props.reconciliationBalance,
  });
});

const chartOption = computed(() => buildBalanceChartOption({
  timeline: props.timeline,
  warningThreshold: props.warningThreshold,
  chartType: props.chartType,
  showWeekends: props.showWeekends,
  reconciliationDate: props.reconciliationDate,
  reconciliationBalance: props.reconciliationBalance,
  focusDate: activeFocus.value?.date,
  accountLabels: props.accountLabels,
}));

const activeFocusEvents = computed<EventOccurrence[]>(() => {
  const focusDate = activeFocus.value?.date;
  if (!focusDate) return [];
  return props.timeline.find((point) => point.date === focusDate)?.events ?? [];
});

const formatCurrency = (value: number) => `¥${value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;
const formatSignedAmount = (category: EventOccurrence['category'], amount: number) => `${category === 'income' ? '+' : '-'}${formatCurrency(amount)}`;

const buildCsvLine = (values: string[]) => values
  .map((value) => {
    const escaped = value.replace(/\r?\n/g, ' ').replace(/"/g, '""');
    return `"${escaped}"`;
  })
  .join(',');

const downloadActiveFocusEventsCsv = () => {
  const focus = activeFocus.value;
  if (!focus) return;
  const focusDate = focus.date;
  const rows = activeFocusEvents.value;
  if (!rows.length) return;

  const header = ['日期', '事件名称', '收支', '金额', '账户'];
  const csv = [
    buildCsvLine(header),
    ...rows.map((event) => buildCsvLine([
      event.date,
      event.name,
      event.category === 'income' ? '收入' : '支出',
      String(event.amount),
      event.accountId ? (props.accountLabels?.[event.accountId]?.name ?? event.accountId) : '',
    ])),
  ].join('\n');

  const fileName = `future-money-events-${focusDate}.csv`;
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });

  const urlCreator = typeof URL.createObjectURL === 'function' ? URL.createObjectURL : undefined;
  const urlRevoker = typeof URL.revokeObjectURL === 'function' ? URL.revokeObjectURL : undefined;

  if (!urlCreator) {
    console.warn('[future-money] download csv failed: URL.createObjectURL is not available');
    return;
  }

  const url = urlCreator(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    urlRevoker?.(url);
  }, 0);
};

const copyInsightSummary = async () => {
  if (!activeInsight.value) return;
  const insight = activeInsight.value;
  const summaryLines: string[] = [
    `【${insight.label}】${insight.date}`,
    `余额：${formatCurrency(insight.balance)}`,
    insight.summary,
  ];

  if (insight.eventSummary) summaryLines.push(insight.eventSummary);
  if (activeFocusEventGroups.value.length) {
    summaryLines.push('', '账户摘要：');
    activeFocusEventGroups.value.forEach((group) => {
      summaryLines.push(`- ${group.label}：${group.summary}`);
    });
  }

  const text = summaryLines.join('\n');

  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    // 兼容不支持 Clipboard API 的环境（或因权限/https 受限失败）
    const fallback = document.createElement('textarea');
    fallback.value = text;
    fallback.setAttribute('readonly', '');
    fallback.style.position = 'fixed';
    fallback.style.left = '-9999px';
    fallback.style.top = '0';
    document.body.appendChild(fallback);
    fallback.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(fallback);
    if (!ok) {
      console.warn('[future-money] copy insight summary failed', error);
      return;
    }
  }
};

const activeFocusEventGroups = computed(() => {
  if (!activeFocusEvents.value.length) return [];

  const hasMultipleAccounts = activeFocusEvents.value.some((event) => event.accountId);
  if (!hasMultipleAccounts) {
    return [{
      key: 'all',
      label: '当日事件',
      summary: `${activeFocusEvents.value.length} 笔`,
      events: activeFocusEvents.value,
      color: undefined as string | undefined,
    }];
  }

  const grouped = new Map<string, EventOccurrence[]>();
  activeFocusEvents.value.forEach((event) => {
    const accountKey = event.accountId?.trim() || '__unknown__';
    const bucket = grouped.get(accountKey) ?? [];
    bucket.push(event);
    grouped.set(accountKey, bucket);
  });

  return Array.from(grouped.entries())
    .map(([accountKey, events]) => {
      const income = events
        .filter((event) => event.category === 'income')
        .reduce((sum, event) => sum + event.amount, 0);
      const expense = events
        .filter((event) => event.category === 'expense')
        .reduce((sum, event) => sum + event.amount, 0);
      const netChange = income - expense;

      const parts: string[] = [`${events.length} 笔`, `净变化 ${netChange >= 0 ? '+' : '-'}${formatCurrency(Math.abs(netChange))}`];
      if (income > 0) parts.push(`收入 ${formatCurrency(income)}`);
      if (expense > 0) parts.push(`支出 ${formatCurrency(expense)}`);

      const accountMeta = accountKey === '__unknown__' ? undefined : props.accountLabels?.[accountKey];

      return {
        key: accountKey,
        label: accountKey === '__unknown__' ? '未标记账户' : accountMeta?.name ?? `账户 ${accountKey}`,
        summary: parts.join(' · '),
        events,
        color: accountMeta?.color,
        netChange,
      };
    })
    .sort((left, right) => {
      const netDelta = Math.abs(right.netChange) - Math.abs(left.netChange);
      if (netDelta !== 0) return netDelta;
      const expenseDelta = right.events.filter((event) => event.category === 'expense').reduce((sum, event) => sum + event.amount, 0)
        - left.events.filter((event) => event.category === 'expense').reduce((sum, event) => sum + event.amount, 0);
      if (expenseDelta !== 0) return expenseDelta;
      return left.label.localeCompare(right.label, 'zh-CN');
    });
});

const handleChartClick = (params: ECElementEvent) => {
  const index = typeof params.dataIndex === 'number' ? params.dataIndex : -1;
  const point = index >= 0 ? props.timeline[index] : null;
  if (!point?.events.length) return;
  emit('select-date', point.date);
};
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

.chart,
.chart-loading-state {
  height: 380px;
}

.chart-loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--fm-border-subtle);
  border-radius: 14px;
  color: var(--fm-text-secondary);
  background: var(--fm-surface-muted);
  font-size: 0.9rem;
}

.chart-runtime-error {
  min-height: 380px;
  border: 1px dashed rgba(239, 68, 68, 0.28);
  border-radius: 14px;
  background: rgba(254, 242, 242, 0.9);
  color: #991b1b;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
  padding: 24px;
}

.chart-runtime-error strong {
  font-size: 1rem;
}

.chart-runtime-error p {
  margin: 0;
  max-width: 360px;
  line-height: 1.6;
  font-size: 0.88rem;
}

.chart-runtime-error-action {
  max-width: 360px;
  line-height: 1.6;
  color: rgba(127, 29, 29, 0.9);
}

.retry-button {
  border: 1px solid rgba(220, 38, 38, 0.18);
  background: #fff;
  color: #b91c1c;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-button:hover {
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(220, 38, 38, 0.3);
}

.retry-button:active {
  transform: translateY(1px);
}

.retry-button:focus-visible {
  outline: 2px solid rgba(220, 38, 38, 0.2);
  outline-offset: 2px;
}

.chart-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.toolbar-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toolbar-copy strong {
  font-size: 0.92rem;
  color: var(--fm-text-primary);
}

.toolbar-copy span {
  font-size: 0.8rem;
  color: var(--fm-text-secondary);
}

.focus-chip-list {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.focus-chip {
  border: 1px solid var(--fm-border-subtle);
  background: var(--fm-surface-muted);
  color: var(--fm-text-secondary);
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.focus-chip:hover {
  border-color: rgba(67, 56, 202, 0.24);
  color: var(--fm-primary);
}

.focus-chip.active {
  background: var(--fm-primary-light);
  color: var(--fm-primary);
  border-color: rgba(67, 56, 202, 0.18);
  box-shadow: inset 0 0 0 1px rgba(67, 56, 202, 0.08);
}

.focus-insight {
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid transparent;
}

.focus-insight.info {
  background: rgba(79, 70, 229, 0.06);
  border-color: rgba(79, 70, 229, 0.12);
}

.focus-insight.warning {
  background: rgba(245, 158, 11, 0.09);
  border-color: rgba(245, 158, 11, 0.18);
}

.focus-insight.success {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.18);
}

.focus-insight-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.focus-insight-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.focus-insight-copy,
.focus-insight-export {
  border: 1px solid var(--fm-border-subtle);
  background: rgba(255, 255, 255, 0.72);
  color: var(--fm-text-secondary);
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.focus-insight-copy:hover,
.focus-insight-export:hover {
  border-color: rgba(67, 56, 202, 0.24);
  color: var(--fm-primary);
  background: rgba(255, 255, 255, 0.92);
}

.focus-insight-copy:focus-visible,
.focus-insight-export:focus-visible {
  outline: 2px solid rgba(79, 70, 229, 0.18);
  outline-offset: 2px;
}

.focus-insight-header div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.focus-insight-header strong {
  color: var(--fm-text-primary);
  font-size: 0.9rem;
}

.focus-insight-header span,
.focus-insight small {
  color: var(--fm-text-secondary);
  font-size: 0.78rem;
  line-height: 1.6;
}

.focus-insight-header b {
  color: var(--fm-text-primary);
  font-family: 'SF Pro Rounded', ui-monospace, sans-serif;
  font-size: 1rem;
}

.focus-insight p {
  margin: 0;
  color: var(--fm-text-primary);
  font-size: 0.9rem;
  line-height: 1.65;
}

.focus-insight .event-summary {
  color: var(--fm-text-primary);
}

.focus-event-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
}

.focus-event-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.focus-event-group-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.focus-event-group-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--fm-text-primary);
  font-size: 0.8rem;
}

.focus-event-group-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.focus-event-group-header span {
  color: var(--fm-text-secondary);
  font-size: 0.76rem;
}

.focus-event-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.focus-event-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--fm-border-subtle);
  background: rgba(255, 255, 255, 0.72);
  color: var(--fm-text-primary);
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.focus-event-chip:hover {
  border-color: rgba(67, 56, 202, 0.24);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
}

.focus-event-chip:focus-visible {
  outline: 2px solid rgba(67, 56, 202, 0.2);
  outline-offset: 2px;
}

.event-chip-name {
  font-weight: 600;
}

.event-chip-amount {
  font-family: 'SF Pro Rounded', ui-monospace, sans-serif;
}

.event-chip-amount.income {
  color: #047857;
}

.event-chip-amount.expense {
  color: #be123c;
}

.chart-empty-state {
  min-height: 380px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--fm-text-secondary);
  gap: 8px;
}

.chart-empty-state strong {
  color: var(--fm-text-primary);
  font-size: 1rem;
}

.chart-empty-state p {
  margin: 0;
  max-width: 360px;
  line-height: 1.6;
}
</style>
