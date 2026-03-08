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
          <b>{{ formatCurrency(activeInsight.balance) }}</b>
        </div>
        <p>{{ activeInsight.summary }}</p>
        <small>{{ activeInsight.detail }}</small>
        <small v-if="activeInsight.eventSummary" class="event-summary">{{ activeInsight.eventSummary }}</small>
      </div>

      <VChart :option="chartOption" autoresize class="chart" @click="handleChartClick" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { ECElementEvent } from 'echarts/core';
import VChart from 'vue-echarts';
import '@/utils/echarts';
import type { DailySnapshot } from '@/types/timeline';
import {
  buildBalanceChartFocusInsight,
  buildBalanceChartFocusTargets,
  buildBalanceChartOption,
  getDefaultBalanceChartFocusDate,
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
  /** 外部联动指定图表焦点 */
  focusKey?: BalanceChartFocusKey;
  /** 外部联动指定图表日期 */
  focusDate?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'select-date', date: string): void;
}>();

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

    const preferredDate = getDefaultBalanceChartFocusDate(
      props.timeline,
      props.warningThreshold,
      props.reconciliationDate,
    );
    const preferredButton = buttons.find((button) => button.date === preferredDate);

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
      };
    }
  }

  return focusButtons.value.find((button) => button.key === activeFocusKey.value) ?? focusButtons.value[0];
});

const activeFocusLabel = computed(() => {
  if (!activeFocus.value) return '拖动下方时间窗查看不同阶段';
  return `${activeFocus.value.label} · ${activeFocus.value.date}`;
});

const activeInsight = computed(() => {
  if (!activeFocus.value) return null;

  if (props.focusDate) {
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
}));

const formatCurrency = (value: number) => `¥${value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;

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

.chart {
  height: 380px;
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
