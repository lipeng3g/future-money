<template>
  <div class="chart-card">
    <h3>月度收支</h3>
    <div v-if="!months.length" class="chart-empty-state">
      <strong>还没有月度收支数据</strong>
      <p>当时间线中开始出现收入或支出事件后，这里会自动汇总每月现金流。</p>
    </div>
    <VChart v-else-if="chartRuntimeReady" :option="chartOption" autoresize class="chart" />
    <div v-else-if="chartRuntimeError" class="chart-runtime-error" role="alert">
      <strong>图表暂时没加载出来</strong>
      <p>{{ chartRuntimeError }}</p>
      <small v-if="chartRuntimeErrorAction" class="chart-runtime-error-action">{{ chartRuntimeErrorAction }}</small>
      <button type="button" class="retry-button" @click="retryChartRuntime">重试加载</button>
    </div>
    <div v-else class="chart-loading-state">正在加载图表引擎…</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import VChart from 'vue-echarts';
import type { MonthlySnapshot } from '@/types/analytics';
import { buildCashFlowChartOption } from '@/utils/chart-options-cashflow';
import { useChartRuntime } from '@/utils/use-chart-runtime';

const props = defineProps<{ months: MonthlySnapshot[] }>();

const chartRuntime = useChartRuntime('cashflow', () => import('@/utils/echarts-cashflow'));
const chartRuntimeReady = chartRuntime.ready;
const chartRuntimeError = chartRuntime.error;
const chartRuntimeErrorAction = chartRuntime.errorAction;

const retryChartRuntime = () => chartRuntime.retry();

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

.chart-runtime-error {
  min-height: 280px;
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
  max-width: 320px;
  line-height: 1.6;
  font-size: 0.88rem;
}

.chart-runtime-error-action {
  max-width: 320px;
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
