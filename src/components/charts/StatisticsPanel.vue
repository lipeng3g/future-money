<template>
  <div class="stats-panel">
    <div class="stats-grid">
      <div class="stat-card primary">
        <div class="stat-badge">余额</div>
        <div class="stat-content">
          <strong class="stat-value">{{ formatCurrency(analytics.endingBalance) }}</strong>
          <span class="stat-label">期末余额</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-badge income">收入</div>
        <div class="stat-content">
          <strong class="stat-value income" style="font-family: 'SF Pro Rounded', ui-monospace, sans-serif;">{{ formatCurrency(analytics.totalIncome) }}</strong>
          <span class="stat-label">累计收入</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-badge expense">支出</div>
        <div class="stat-content">
          <strong class="stat-value expense" style="font-family: 'SF Pro Rounded', ui-monospace, sans-serif;">{{ formatCurrency(analytics.totalExpense) }}</strong>
          <span class="stat-label">累计支出</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-badge">MIN</div>
        <div class="stat-content">
          <strong class="stat-value">{{ formatCurrency(analytics.extremes.minBalance) }}</strong>
          <span class="stat-label">最低余额</span>
          <small class="stat-date">{{ analytics.extremes.minDate }}</small>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-badge">MAX</div>
        <div class="stat-content">
          <strong class="stat-value" style="font-family: 'SF Pro Rounded', ui-monospace, sans-serif;">{{ formatCurrency(analytics.extremes.maxBalance) }}</strong>
          <span class="stat-label">最高余额</span>
          <small class="stat-date">{{ analytics.extremes.maxDate }}</small>
        </div>
      </div>

      <a-popover
        v-if="analytics.warningDates.length"
        placement="bottom"
        trigger="hover"
        overlayClassName="warning-dates-popover"
      >
        <template #content>
          <div class="warning-dates-list">
            <div class="warning-dates-header">预警日期详情（共{{ analytics.warningDates.length }}天）</div>
            <div class="warning-dates-scroll">
              <div
                v-for="(date, index) in analytics.warningDates"
                :key="date"
                class="warning-date-item"
              >
                <span class="date-index">{{ index + 1 }}.</span>
                <span class="date-text">{{ date }}</span>
              </div>
            </div>
          </div>
        </template>
        <div class="stat-card warning clickable">
          <div class="stat-badge warning">!</div>
          <div class="stat-content">
            <strong class="stat-value">{{ analytics.warningDates.length }} 天</strong>
            <span class="stat-label">预警天数</span>
            <small class="stat-date">首次: {{ analytics.warningDates[0] }}</small>
          </div>
        </div>
      </a-popover>

      <div class="stat-card safe" v-else>
        <div class="stat-badge safe">✓</div>
        <div class="stat-content">
          <strong class="stat-value">安全</strong>
          <span class="stat-label">预警状态</span>
          <small class="stat-date">余额始终充足</small>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnalyticsSummary } from '@/types/analytics';

defineProps<{ analytics: AnalyticsSummary }>();

const formatCurrency = (value: number) => `¥${value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;
</script>

<style scoped>
.stats-panel {
  background: transparent;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-card {
  background: var(--fm-surface);
  border: 1px solid var(--fm-border-subtle);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: var(--fm-shadow-sm);
  position: relative;
  overflow: hidden;
  z-index: 1;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: transparent;
  transition: opacity 0.3s ease;
  z-index: -1;
}

.stat-card:hover {
  box-shadow: var(--fm-shadow-premium);
  transform: translateY(-6px) scale(1.02);
}

.stat-card.clickable {
  cursor: pointer;
}

.stat-card.clickable:hover {
  box-shadow: var(--fm-shadow-premium);
}

.stat-card.primary {
  background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%);
  color: white;
  border: none;
  box-shadow: 0 16px 32px -8px rgba(67, 56, 202, 0.4);
}

.stat-card.primary::before {
  background: linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.4));
}

.stat-card.primary .stat-label,
.stat-card.primary .stat-date {
  color: rgba(255, 255, 255, 0.7);
}

.stat-card.primary .stat-value {
  color: white;
  font-family: 'SF Pro Rounded', ui-monospace, sans-serif;
}

.stat-card.primary .stat-badge {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  backdrop-filter: blur(8px);
}

.stat-card.warning {
  background: linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%);
  border-color: rgba(245, 158, 11, 0.2);
}

.stat-card.warning::before {
  background: linear-gradient(90deg, #fcd34d, #f59e0b);
}

.stat-card.safe {
  background: linear-gradient(145deg, #f0fdf4 0%, #dcfce7 100%);
  border-color: rgba(16, 185, 129, 0.2);
}

.stat-card.safe::before {
  background: linear-gradient(90deg, #34d399, #10b981);
}

.stat-card:not(.primary):not(.warning):not(.safe) {
  background: var(--fm-surface-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.stat-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(15, 23, 42, 0.04);
  color: #475569;
  align-self: flex-start;
}

.stat-badge.income {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.stat-badge.expense {
  background: rgba(244, 63, 94, 0.12);
  color: #be123c;
}

.stat-badge.warning {
  background: #fef3c7;
  color: #d97706;
  font-size: 1rem;
  padding: 4px 12px;
}

.stat-badge.safe {
  background: rgba(16, 185, 129, 0.08);
  color: #16a34a;
  font-size: 1rem;
  padding: 4px 12px;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--fm-text-secondary);
  order: 2;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--fm-text-primary);
  line-height: 1.1;
  order: 1;
  letter-spacing: -0.02em;
}

.stat-value.income {
  color: var(--fm-income);
}

.stat-value.expense {
  color: var(--fm-expense);
}

.stat-date {
  display: block;
  font-size: 0.7rem;
  color: #9ca3af;
  order: 3;
}

/* 预警日期弹窗样式 */
.warning-dates-list {
  max-width: 300px;
}

.warning-dates-header {
  font-weight: 600;
  color: var(--fm-text-primary);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.warning-dates-scroll {
  max-height: 300px;
  overflow-y: auto;
}

.warning-date-item {
  padding: 6px 0;
  display: flex;
  gap: 8px;
  font-size: 0.875rem;
}

.date-index {
  color: #9ca3af;
  font-weight: 500;
  min-width: 24px;
}

.date-text {
  color: var(--fm-expense);
  font-weight: 500;
}

.warning-dates-scroll::-webkit-scrollbar {
  width: 6px;
}

.warning-dates-scroll::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.warning-dates-scroll::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
