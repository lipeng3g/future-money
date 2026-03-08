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
      <VChart :option="chartOption" autoresize class="chart" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import VChart from 'vue-echarts';
import '@/utils/echarts';
import type { DailySnapshot } from '@/types/timeline';
import { buildBalanceChartOption, getDefaultBalanceChartFocusDate } from '@/utils/chart-options';

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

type FocusKey = 'latest' | 'today' | 'warning' | 'min' | 'reconciliation';

const focusButtons = computed(() => {
  if (!props.timeline.length) return [] as Array<{ key: FocusKey; label: string; date: string }>;

  const firstWarning = props.timeline.find((point) => point.balance < props.warningThreshold)?.date;
  const today = props.timeline.find((point) => point.isToday)?.date;
  const minPoint = props.timeline.reduce((lowest, point) => (
    point.balance < lowest.balance ? point : lowest
  ), props.timeline[0]);
  const latest = props.timeline.at(-1)?.date;

  return [
    latest ? { key: 'latest' as const, label: '最新区间', date: latest } : null,
    today ? { key: 'today' as const, label: '今天', date: today } : null,
    firstWarning ? { key: 'warning' as const, label: '首次预警', date: firstWarning } : null,
    minPoint?.date ? { key: 'min' as const, label: '最低点', date: minPoint.date } : null,
    props.reconciliationDate && props.timeline.some((point) => point.date === props.reconciliationDate)
      ? { key: 'reconciliation' as const, label: '最近对账', date: props.reconciliationDate }
      : null,
  ].filter((item): item is { key: FocusKey; label: string; date: string } => Boolean(item));
});

const activeFocusKey = ref<FocusKey>('latest');

watch(
  focusButtons,
  (buttons) => {
    const availableKeys = new Set(buttons.map((button) => button.key));
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

const activeFocus = computed(() => (
  focusButtons.value.find((button) => button.key === activeFocusKey.value) ?? focusButtons.value[0]
));

const activeFocusLabel = computed(() => {
  if (!activeFocus.value) return '拖动下方时间窗查看不同阶段';
  return `${activeFocus.value.label} · ${activeFocus.value.date}`;
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
