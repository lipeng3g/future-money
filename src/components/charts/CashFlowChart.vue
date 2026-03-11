<template>
  <div class="chart-card">
    <div class="chart-header">
      <h3>月度收支</h3>
      <button
        v-if="months.length"
        type="button"
        class="chart-export"
        @click="downloadMonthlyCashFlowCsv"
      >
        导出 CSV
      </button>
    </div>

    <div v-if="!months.length" class="chart-empty-state">
      <strong>还没有月度收支数据</strong>
      <p>当时间线中开始出现收入或支出事件后，这里会自动汇总每月现金流。</p>
    </div>
    <VChart v-else-if="chartRuntimeReady" :option="chartOption" autoresize class="chart" />
    <ChartRuntimeErrorNotice
      v-else-if="chartRuntimeError && !dismissedRuntimeError"
      class="chart-runtime-notice"
      :message="chartRuntimeError"
      :action="chartRuntimeErrorAction"
      @retry="retryChartRuntime"
      @dismiss="dismissChartRuntimeError"
    />
    <div v-else class="chart-loading-state">正在加载图表引擎…</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import VChart from 'vue-echarts';
import ChartRuntimeErrorNotice from '@/components/charts/ChartRuntimeErrorNotice.vue';
import type { MonthlySnapshot } from '@/types/analytics';
import { buildCashFlowChartOption } from '@/utils/chart-options-cashflow';
import { useChartRuntime } from '@/utils/use-chart-runtime';

const props = defineProps<{ months: MonthlySnapshot[] }>();

const chartRuntime = useChartRuntime('cashflow', () => import('@/utils/echarts-cashflow'));
const chartRuntimeReady = chartRuntime.ready;
const chartRuntimeError = chartRuntime.error;
const chartRuntimeErrorAction = chartRuntime.errorAction;
const dismissedRuntimeError = ref(false);

const retryChartRuntime = async () => {
  dismissedRuntimeError.value = false;
  await chartRuntime.retry();
};

const dismissChartRuntimeError = () => {
  // 避免在网络持续异常时反复挡住页面；用户需要时可点“重试加载”。
  dismissedRuntimeError.value = true;
};

const chartOption = computed(() => buildCashFlowChartOption(props.months));

const buildCsvLine = (values: string[]) => values
  .map((value) => {
    const escaped = value.replace(/\r?\n/g, ' ').replace(/"/g, '""');
    return `"${escaped}"`;
  })
  .join(',');

const downloadMonthlyCashFlowCsv = () => {
  if (!props.months.length) return;

  const header = ['月份', '收入', '支出', '净额'];
  const csv = [
    buildCsvLine(header),
    ...props.months.map((row) => buildCsvLine([
      row.monthLabel,
      String(row.income),
      String(row.expense),
      String(row.net),
    ])),
  ].join('\n');

  const firstMonth = props.months[0]?.monthLabel;
  const lastMonth = props.months[props.months.length - 1]?.monthLabel;
  const fileName = firstMonth && lastMonth
    ? `future-money-cashflow-${firstMonth}-to-${lastMonth}.csv`
    : 'future-money-cashflow.csv';

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

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.chart-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--fm-text-primary);
}

.chart-export {
  border: 1px solid var(--fm-border-subtle);
  background: rgba(255, 255, 255, 0.72);
  color: var(--fm-text-secondary);
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.chart-export:hover {
  border-color: rgba(67, 56, 202, 0.24);
  color: var(--fm-primary);
  background: rgba(255, 255, 255, 0.92);
}

.chart-export:focus-visible {
  outline: 2px solid rgba(79, 70, 229, 0.18);
  outline-offset: 2px;
}

.chart,
.chart-loading-state,
.chart-runtime-notice {
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
