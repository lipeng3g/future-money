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
          <strong class="stat-value income">{{ formatCurrency(analytics.totalIncome) }}</strong>
          <span class="stat-label">累计收入</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-badge expense">支出</div>
        <div class="stat-content">
          <strong class="stat-value expense">{{ formatCurrency(analytics.totalExpense) }}</strong>
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
          <strong class="stat-value">{{ formatCurrency(analytics.extremes.maxBalance) }}</strong>
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
  gap: 16px;
}

.stat-card {
  background: white;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: #e5e7eb;
  transition: background 0.2s ease;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.stat-card.clickable {
  cursor: pointer;
}

.stat-card.clickable:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.stat-card.primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
}

.stat-card.primary::before {
  background: rgba(255, 255, 255, 0.3);
}

.stat-card.primary .stat-label,
.stat-card.primary .stat-date {
  color: rgba(255, 255, 255, 0.85);
}

.stat-card.primary .stat-value {
  color: white;
}

.stat-card.primary .stat-badge {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.stat-card.warning {
  background: #fffbeb;
  border-color: #fbbf24;
}

.stat-card.warning::before {
  background: #fbbf24;
}

.stat-card.safe {
  background: #f0fdf4;
  border-color: #10b981;
}

.stat-card.safe::before {
  background: #10b981;
}

.stat-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #f3f4f6;
  color: #6b7280;
  align-self: flex-start;
}

.stat-badge.income {
  background: #d1fae5;
  color: #059669;
}

.stat-badge.expense {
  background: #fee2e2;
  color: #dc2626;
}

.stat-badge.warning {
  background: #fef3c7;
  color: #d97706;
  font-size: 1rem;
  padding: 4px 12px;
}

.stat-badge.safe {
  background: #d1fae5;
  color: #059669;
  font-size: 1rem;
  padding: 4px 12px;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  order: 2;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
  line-height: 1.2;
  order: 1;
}

.stat-value.income {
  color: #10b981;
}

.stat-value.expense {
  color: #ef4444;
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
  color: #111827;
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
  color: #ef4444;
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
