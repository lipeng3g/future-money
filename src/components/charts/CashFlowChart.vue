<template>
  <div class="chart-card">
    <h3>月度收支</h3>
    <div v-if="!months.length" class="chart-empty-state">
      <strong>还没有月度收支数据</strong>
      <p>当时间线中开始出现收入或支出事件后，这里会自动汇总每月现金流。</p>
    </div>
    <VChart v-else-if="chartRuntimeReady" :option="chartOption" autoresize class="chart" />
    <div v-else class="chart-loading-state">正在加载图表引擎…</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import VChart from 'vue-echarts';
import type { MonthlySnapshot } from '@/types/analytics';
import { buildCashFlowChartOption } from '@/utils/chart-options-cashflow';

const props = defineProps<{ months: MonthlySnapshot[] }>();

const chartRuntimeReady = ref(false);

onMounted(async () => {
  await import('@/utils/echarts-cashflow');
  chartRuntimeReady.value = true;
});

const chartOption = computed(() => buildCashFlowChartOption(props.months));
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

.chart,
.chart-loading-state {
  height: 280px;
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

.chart-empty-state {
  min-height: 280px;
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
  max-width: 320px;
  line-height: 1.6;
}
</style>
