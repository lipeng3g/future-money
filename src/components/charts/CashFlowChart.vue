<template>
  <div class="chart-card">
    <h3>月度收支</h3>
    <div v-if="!months.length" class="chart-empty-state">
      <strong>还没有月度收支数据</strong>
      <p>当时间线中开始出现收入或支出事件后，这里会自动汇总每月现金流。</p>
    </div>
    <VChart v-else :option="chartOption" autoresize class="chart" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import VChart from 'vue-echarts';
import '@/utils/echarts-cashflow';
import type { MonthlySnapshot } from '@/types/analytics';
import { buildCashFlowChartOption } from '@/utils/chart-options-cashflow';

const props = defineProps<{ months: MonthlySnapshot[] }>();

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

.chart {
  height: 280px;
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
