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
import {
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
}

const props = defineProps<Props>();

const focusButtons = computed(() => buildBalanceChartFocusTargets(
  props.timeline,
  props.warningThreshold,
  props.reconciliationDate,
));

const activeFocusKey = ref<BalanceChartFocusKey>('latest');

watch(
  [focusButtons, () => props.focusKey] as const,
  ([buttons, requestedFocusKey]) => {
    const availableKeys = new Set(buttons.map((button) => button.key));

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
