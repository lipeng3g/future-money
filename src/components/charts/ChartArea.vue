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
    <StatisticsPanel :analytics="store.analytics" />

    <!-- 余额走势图 + 即将发生 + 事件入口 -->
    <div class="balance-section">
      <BalanceChart
        :timeline="store.timeline"
        :warning-threshold="store.account.warningThreshold"
        :chart-type="store.preferences.chartType"
        :show-weekends="store.preferences.showWeekends"
      />
      <UpcomingEvents :timeline="store.timeline" />
      <button class="events-trigger" @click="$emit('openDrawer')" title="打开现金流事件管理">
        <span class="trigger-icon">
          <AppIcon name="clipboard" :size="24" />
        </span>
        <span class="trigger-text">现金流事件</span>
        <span class="event-count-badge">{{ store.events.length }}</span>
      </button>
    </div>

    <!-- 月度收支图 -->
    <CashFlowChart :months="store.analytics.months" />
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
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
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

.events-trigger {
  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 16px;
  padding: 20px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(59, 130, 246, 0.35);
  transition: all 0.2s ease;
  width: 72px;
  min-height: 320px;
}

.events-trigger:hover {
  transform: translateX(-4px);
  box-shadow: 0 8px 22px rgba(59, 130, 246, 0.45);
  background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
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
  background: rgba(255, 255, 255, 0.2);
  padding: 6px 10px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 700;
  min-width: 36px;
}
</style>
