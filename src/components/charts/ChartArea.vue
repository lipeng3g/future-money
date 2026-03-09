<template>
  <section class="chart-area">
    <!-- 引导/对账横幅 -->
    <ReconciliationBanner
      @reconcile="reconcileModalOpen = true"
      @open-drawer="emit('openDrawer')"
    />

    <header class="panel-header">
      <div>
        <h2>未来余额走势</h2>
        <p>预测未来现金余额走势，提前发现资金缺口。</p>
      </div>
      <div class="header-actions">
        <button class="ai-trigger" @click="handleAiClick" title="AI 财务分析">
          <AppIcon name="sparkle" :size="18" />
          <span>AI 分析</span>
        </button>
        <TimeRangeControl :value="store.viewMonths" @change="store.setViewMonths" />
      </div>
    </header>

    <!-- 关键指标置顶 -->
    <div id="stats-panel">
      <StatisticsPanel :analytics="store.analytics" @focus-chart="handleStatsFocusChart" />
    </div>

    <!-- 左右两栏：图表 | 即将发生 + 事件入口 -->
    <div class="main-grid">
      <div class="chart-column">
        <div id="balance-chart-card" ref="balanceChartCardRef" class="balance-card">
          <BalanceChart
            v-if="showBalanceChart"
            :timeline="store.timeline"
            :warning-threshold="store.warningThreshold"
            :chart-type="store.preferences.chartType"
            :show-weekends="store.preferences.showWeekends"
            :reconciliation-date="store.latestReconciliation?.date"
            :reconciliation-balance="store.latestReconciliation?.balance"
            :focus-key="balanceChartFocusKey"
            :focus-date="balanceChartFocusDate"
            @select-date="handleChartDateSelect"
          />
          <div v-else class="chart-skeleton" aria-live="polite">
            <div class="chart-skeleton-header">
              <span class="chart-skeleton-pill w-20"></span>
              <span class="chart-skeleton-pill w-28"></span>
            </div>
            <div class="chart-skeleton-hero"></div>
            <div class="chart-skeleton-axis">
              <span v-for="item in 6" :key="item" class="chart-skeleton-tick"></span>
            </div>
            <p>正在按需加载余额图，先把首屏交互让出来。</p>
          </div>
        </div>
        <div id="cashflow-chart-card" ref="cashflowChartCardRef">
          <CashFlowChart v-if="showCashFlowChart" :months="store.analytics.months" />
          <div v-else class="chart-skeleton compact" aria-live="polite">
            <div class="chart-skeleton-header">
              <span class="chart-skeleton-pill w-16"></span>
              <span class="chart-skeleton-pill w-24"></span>
            </div>
            <div class="chart-skeleton-bars">
              <span v-for="item in 8" :key="item" class="chart-skeleton-bar" :style="{ height: `${36 + (item % 4) * 18}px` }"></span>
            </div>
            <p>滚动到这里时再加载月度图表，减少初次打开等待。</p>
          </div>
        </div>
      </div>
      <div class="side-column">
        <button class="events-trigger" @click="emit('openDrawer')" title="打开现金流事件管理">
          <span class="trigger-icon">
            <AppIcon name="clipboard" :size="22" />
          </span>
          <span class="trigger-text">现金流事件</span>
          <span class="event-count-badge">{{ store.events.length }}</span>
        </button>
        <div class="upcoming-wrapper">
          <UpcomingEvents :timeline="store.timeline" />
        </div>
      </div>
    </div>

    <!-- 对账弹窗 -->
    <ReconciliationModal
      v-if="reconcileModalOpen"
      :open="reconcileModalOpen"
      @cancel="reconcileModalOpen = false"
      @done="handleReconcileDone"
    />

    <!-- AI 配置弹窗（首次使用时弹出） -->
    <AiConfigModal
      v-if="aiConfigOpen"
      :open="aiConfigOpen"
      @cancel="aiConfigOpen = false"
      @saved="handleConfigSaved"
    />

    <!-- AI 对话抽屉 -->
    <AiAnalysisModal
      v-if="aiChatOpen"
      :open="aiChatOpen"
      @close="aiChatOpen = false"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import type { BalanceChartFocusKey } from '@/utils/chart-options';
import TimeRangeControl from '@/components/charts/TimeRangeControl.vue';
import StatisticsPanel from '@/components/charts/StatisticsPanel.vue';
import UpcomingEvents from '@/components/charts/UpcomingEvents.vue';
import ReconciliationBanner from '@/components/reconciliation/ReconciliationBanner.vue';
import { useFinanceStore } from '@/stores/finance';
import AppIcon from '@/components/common/AppIcon.vue';

const BalanceChart = defineAsyncComponent(() => import('@/components/charts/BalanceChart.vue'));
const CashFlowChart = defineAsyncComponent(() => import('@/components/charts/CashFlowChart.vue'));
const ReconciliationModal = defineAsyncComponent(() => import('@/components/reconciliation/ReconciliationModal.vue'));
const AiAnalysisModal = defineAsyncComponent(() => import('@/components/ai/AiAnalysisModal.vue'));
const AiConfigModal = defineAsyncComponent(() => import('@/components/ai/AiConfigModal.vue'));
const loadAiConfig = async () => {
  const mod = await import('@/utils/ai');
  return mod.loadAiConfig();
};

const props = withDefaults(defineProps<{
  focusDate?: string | null;
  focusNonce?: number;
}>(), {
  focusDate: null,
  focusNonce: 0,
});

const emit = defineEmits<{
  (e: 'openDrawer'): void;
  (e: 'focusEventsByDate', date: string): void;
}>();

const store = useFinanceStore();
const reconcileModalOpen = ref(false);
const aiConfigOpen = ref(false);
const aiChatOpen = ref(false);
const balanceChartFocusKey = ref<BalanceChartFocusKey>('latest');
const balanceChartFocusDate = ref<string | undefined>(undefined);
const balanceChartCardRef = ref<HTMLElement | null>(null);
const cashflowChartCardRef = ref<HTMLElement | null>(null);
const shouldRenderBalanceChart = ref(false);
const shouldRenderCashFlowChart = ref(false);
const hasBalanceTimelineData = computed(() => store.timeline.length > 0);
const hasCashFlowData = computed(() => store.analytics.months.length > 0);
const showBalanceChart = computed(() => shouldRenderBalanceChart.value || !hasBalanceTimelineData.value);
const showCashFlowChart = computed(() => shouldRenderCashFlowChart.value || !hasCashFlowData.value);

const BALANCE_CHART_FALLBACK_DELAY = 1800;
const CASHFLOW_CHART_FALLBACK_DELAY = 2600;
const chartObservers: IntersectionObserver[] = [];
const chartFallbackTimers: number[] = [];

const canUseIntersectionObserver = () => typeof window !== 'undefined' && 'IntersectionObserver' in window;

const clearChartFallbackTimer = (timerId?: number) => {
  if (timerId === undefined || typeof window === 'undefined') return;
  window.clearTimeout(timerId);
  const index = chartFallbackTimers.indexOf(timerId);
  if (index >= 0) {
    chartFallbackTimers.splice(index, 1);
  }
};

const scheduleChartFallbackReveal = (type: 'balance' | 'cashflow') => {
  if (typeof window === 'undefined') return undefined;
  const delay = type === 'balance' ? BALANCE_CHART_FALLBACK_DELAY : CASHFLOW_CHART_FALLBACK_DELAY;
  const timerId = window.setTimeout(() => {
    revealChart(type);
    clearChartFallbackTimer(timerId);
  }, delay);
  chartFallbackTimers.push(timerId);
  return timerId;
};

const revealChart = (type: 'balance' | 'cashflow') => {
  if (type === 'balance') {
    shouldRenderBalanceChart.value = true;
    return;
  }
  shouldRenderCashFlowChart.value = true;
};

const observeDeferredChart = (
  elementRef: typeof balanceChartCardRef,
  type: 'balance' | 'cashflow',
  rootMargin: string,
) => {
  if (type === 'balance' && !hasBalanceTimelineData.value) {
    revealChart(type);
    return;
  }

  if (type === 'cashflow' && !hasCashFlowData.value) {
    revealChart(type);
    return;
  }

  if (!canUseIntersectionObserver()) {
    revealChart(type);
    return;
  }

  const target = elementRef.value;
  if (!target) {
    revealChart(type);
    return;
  }

  const fallbackTimerId = scheduleChartFallbackReveal(type);
  const observer = new window.IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    clearChartFallbackTimer(fallbackTimerId);
    revealChart(type);
    observer.disconnect();
  }, {
    rootMargin,
    threshold: 0.01,
  });

  observer.observe(target);
  chartObservers.push(observer);
};

const handleAiClick = async () => {
  const config = await loadAiConfig();
  if (config && config.apiKey) {
    aiChatOpen.value = true;
  } else {
    aiConfigOpen.value = true;
  }
};

const handleConfigSaved = () => {
  aiConfigOpen.value = false;
  aiChatOpen.value = true;
};

const handleReconcileDone = () => {
  reconcileModalOpen.value = false;
  message.success('对账完成');
};

watch(
  () => [props.focusDate, props.focusNonce, shouldRenderBalanceChart.value] as const,
  ([focusDate]) => {
    if (!focusDate) {
      balanceChartFocusDate.value = undefined;
      return;
    }
    balanceChartFocusDate.value = focusDate;
    balanceChartFocusKey.value = 'latest';
  },
  { immediate: true },
);

const handleStatsFocusChart = (key: BalanceChartFocusKey) => {
  balanceChartFocusKey.value = key;
  balanceChartFocusDate.value = undefined;
};

const handleChartDateSelect = (date: string) => {
  emit('focusEventsByDate', date);
};

onMounted(() => {
  observeDeferredChart(balanceChartCardRef, 'balance', '320px 0px');
  observeDeferredChart(cashflowChartCardRef, 'cashflow', '180px 0px');
});

onBeforeUnmount(() => {
  chartObservers.forEach((observer) => observer.disconnect());
  chartObservers.length = 0;
  chartFallbackTimers.splice(0).forEach((timerId) => {
    if (typeof window !== 'undefined') {
      window.clearTimeout(timerId);
    }
  });
});
</script>

<style scoped>
.chart-area {
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.panel-header {
  background: transparent;
  border: none;
  padding: 0 0 8px 0;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-end;
}

.panel-header p {
  margin: 4px 0 0;
  color: #6b7280;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #4338ca 0%, #6366f1 100%);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 12px rgba(67, 56, 202, 0.25);
  white-space: nowrap;
}

.ai-trigger:hover {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 8px 20px rgba(67, 56, 202, 0.35);
}

.ai-trigger:active {
  transform: translateY(0) scale(1);
}

.main-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 20px;
  align-items: stretch;
}

.chart-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.side-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
  /* 不参与 grid 行高计算，高度由左栏决定 */
  height: 0;
  min-height: 100%;
}

.upcoming-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.events-trigger {
  background: #fff;
  color: var(--fm-text-primary);
  border: 1px solid var(--fm-border-subtle);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  box-shadow: var(--fm-shadow-sm);
  transition: border-color 0.2s, box-shadow 0.2s;
  width: 100%;
}

.events-trigger:hover {
  border-color: var(--fm-primary);
  box-shadow: var(--fm-shadow-md);
}

.trigger-icon,
.trigger-text,
.event-count-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.trigger-text {
  font-weight: 600;
  font-size: 0.9rem;
  flex: 1;
}

.event-count-badge {
  background: var(--fm-primary-light);
  padding: 6px 10px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 700;
  min-width: 36px;
  color: var(--fm-primary);
}

.chart-skeleton {
  border: 1px solid var(--fm-border-subtle);
  border-radius: 16px;
  padding: 24px;
  min-height: 380px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92));
  box-shadow: var(--fm-shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-skeleton.compact {
  min-height: 280px;
}

.chart-skeleton-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.chart-skeleton-pill,
.chart-skeleton-hero,
.chart-skeleton-tick,
.chart-skeleton-bar {
  position: relative;
  overflow: hidden;
  background: rgba(148, 163, 184, 0.18);
}

.chart-skeleton-pill::after,
.chart-skeleton-hero::after,
.chart-skeleton-tick::after,
.chart-skeleton-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.72), transparent);
  animation: chart-skeleton-shimmer 1.5s ease-in-out infinite;
}

.chart-skeleton-pill {
  display: inline-flex;
  height: 14px;
  border-radius: 999px;
}

.chart-skeleton-pill.w-16 {
  width: 96px;
}

.chart-skeleton-pill.w-20 {
  width: 128px;
}

.chart-skeleton-pill.w-24 {
  width: 160px;
}

.chart-skeleton-pill.w-28 {
  width: 196px;
}

.chart-skeleton-hero {
  flex: 1;
  min-height: 240px;
  border-radius: 18px;
}

.chart-skeleton-axis {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
}

.chart-skeleton-tick {
  height: 10px;
  border-radius: 999px;
}

.chart-skeleton-bars {
  flex: 1;
  min-height: 180px;
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 0 4px;
}

.chart-skeleton-bar {
  flex: 1;
  min-height: 32px;
  border-radius: 12px 12px 4px 4px;
}

.chart-skeleton p {
  margin: 0;
  font-size: 0.83rem;
  color: var(--fm-text-secondary);
  line-height: 1.6;
}

@keyframes chart-skeleton-shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
