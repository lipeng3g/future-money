<template>
  <section class="chart-area">
    <header class="panel-header">
      <div>
        <h2>未来余额走势</h2>
        <p>通过曲线预判未来 12~36 个月的现金余额，辅助提前决策。</p>
      </div>
      <TimeRangeControl :value="store.viewMonths" @change="store.setViewMonths" />
    </header>

    <!-- 关键指标置顶 -->
    <div id="stats-panel">
      <StatisticsPanel :analytics="store.analytics" />
    </div>

    <!-- 余额走势图 + 即将发生 + 事件入口 -->
    <div class="balance-section">
      <div id="balance-chart-card" class="balance-card">
        <BalanceChart
          :timeline="store.timeline"
          :warning-threshold="store.warningThreshold"
          :chart-type="store.preferences.chartType"
          :show-weekends="store.preferences.showWeekends"
          :snapshot-date="store.activeSnapshot?.date"
          :snapshot-balance="store.activeSnapshot?.balance"
          :is-historical="store.isHistoricalView"
        />
      </div>
      <div class="upcoming-wrapper">
        <UpcomingEvents :timeline="store.timeline" />
      </div>
      <button class="events-trigger" @click="$emit('openDrawer')" title="打开现金流事件管理">
        <span class="trigger-icon">
          <AppIcon name="clipboard" :size="24" />
        </span>
        <span class="trigger-text">现金流事件</span>
        <span class="event-count-badge">{{ store.events.length }}</span>
      </button>
    </div>

    <!-- 月度收支图 -->
    <div id="cashflow-chart-card">
      <CashFlowChart :months="store.analytics.months" />
    </div>
  </section>
</template>

<script setup lang="ts">
import TimeRangeControl from '@/components/charts/TimeRangeControl.vue';
import BalanceChart from '@/components/charts/BalanceChart.vue';
import CashFlowChart from '@/components/charts/CashFlowChart.vue';
import StatisticsPanel from '@/components/charts/StatisticsPanel.vue';
import UpcomingEvents from '@/components/charts/UpcomingEvents.vue';
import { useFinanceStore } from '@/stores/finance';
import AppIcon from '@/components/common/AppIcon.vue';

const store = useFinanceStore();
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



.balance-section {
  display: grid;
  grid-template-columns: 1fr 320px 72px;
  gap: 20px;
}

.balance-card,
.upcoming-wrapper {
  height: 100%;
}

.events-trigger {
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  color: var(--fm-text-primary);
  border: 1px solid var(--fm-border-subtle);
  border-radius: 999px;
  padding: 20px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  cursor: pointer;
  box-shadow: var(--fm-shadow-md);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 72px;
  min-height: 320px;
}

.events-trigger:hover {
  transform: translateY(-4px);
  box-shadow: var(--fm-shadow-lg);
  border-color: var(--fm-primary);
  background: #fff;
}

.trigger-icon,
.trigger-text,
.event-count-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.trigger-icon :deep(.app-icon) {
  width: 28px;
  height: 28px;
}

.trigger-text {
  font-weight: 600;
  font-size: 0.85rem;
  line-height: 1.3;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  letter-spacing: 0.08em;
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
</style>
