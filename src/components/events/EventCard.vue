<template>
  <article class="event-card" :class="[event.category, { highlighted, 'chart-focused': chartFocused }]">
    <div class="card-indicator" :class="event.category"></div>
    <div class="event-content">
      <div class="event-main">
        <div class="event-header">
          <h3>{{ event.name }}</h3>
          <span v-if="!event.enabled" class="status-badge paused">已暂停</span>
        </div>
        <div class="event-meta">
          <span v-if="accountLabel" class="account-tag">
            <span class="account-dot" :style="{ background: accountColor }" />
            {{ accountLabel }}
          </span>
          <span class="recurrence">{{ recurrenceLabel }}</span>
          <button
            v-if="chartFocusable"
            type="button"
            class="chart-focus-link"
            @click="$emit('focus-chart', event)"
          >
            查看图上日期
          </button>
        </div>
      </div>
      
      <div class="event-right">
        <div class="amount" :class="event.category">{{ amountLabel }}</div>
        <div class="event-actions">
          <a-switch :checked="event.enabled" size="small" :disabled="isReadOnly" @change="handleToggle" />
          <a-button v-if="!isReadOnly" type="text" size="small" class="action-btn" @click="$emit('edit', event)">
            <template #icon><AppIcon name="edit" :size="16" /></template>
          </a-button>
          <a-button v-if="!isReadOnly" type="text" size="small" danger class="action-btn" @click="$emit('delete', event)">
            <template #icon><AppIcon name="delete" :size="16" /></template>
          </a-button>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CashFlowEvent } from '@/types/event';
import AppIcon from '@/components/common/AppIcon.vue';
import { useFinanceStore } from '@/stores/finance';

const props = defineProps<{ event: CashFlowEvent; readonly?: boolean; highlighted?: boolean; chartFocusable?: boolean; chartFocused?: boolean }>();
const emit = defineEmits<{
  (e: 'toggle', payload: { id: string; enabled: boolean }): void;
  (e: 'edit', event: CashFlowEvent): void;
  (e: 'delete', event: CashFlowEvent): void;
  (e: 'focus-chart', event: CashFlowEvent): void;
}>();

const store = useFinanceStore();

const isReadOnly = computed(() => props.readonly ?? store.isReadOnly);

const accountInfo = computed(() => store.accounts.find((a) => a.id === props.event.accountId));
const accountLabel = computed(() => accountInfo.value?.name ?? '');
const accountColor = computed(() => accountInfo.value?.color ?? '#6b7280');

const amountLabel = computed(() => {
  const prefix = props.event.category === 'income' ? '+' : '-';
  return `${prefix}¥${props.event.amount.toLocaleString('zh-CN')}`;
});

const recurrenceLabel = computed(() => {
  switch (props.event.type) {
    case 'once':
      return `一次性 · ${props.event.onceDate ?? props.event.startDate}`;
    case 'monthly':
      return `每月${props.event.monthlyDay ?? '某'}日`;
    case 'quarterly':
      return `每季度${props.event.monthlyDay ?? '某'}日`;
    case 'semi-annual':
      return `每半年${props.event.monthlyDay ?? '某'}日`;
    case 'yearly':
      return `每年 ${props.event.yearlyMonth} 月 ${props.event.yearlyDay} 日`;
    default:
      return '未知频率';
  }
});

const handleToggle = (checked: boolean) => {
  emit('toggle', { id: props.event.id, enabled: checked });
};
</script>

<style scoped>
.event-card {
  position: relative;
  background: var(--fm-surface);
  border: 1px solid var(--fm-border-subtle);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  display: flex;
  align-items: stretch;
}

.event-card.highlighted {
  border-color: rgba(67, 56, 202, 0.42);
  box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.12), var(--fm-shadow-md);
  background: linear-gradient(180deg, rgba(67, 56, 202, 0.04), rgba(67, 56, 202, 0.01));
}

.event-card.chart-focused {
  border-color: rgba(14, 165, 233, 0.36);
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1), var(--fm-shadow-md);
}

.event-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--fm-shadow-md);
  border-color: var(--fm-primary-light);
}

.card-indicator {
  width: 4px;
  background: var(--fm-border-subtle);
  border-radius: 4px;
  margin-right: 16px;
}

.card-indicator.income {
  background: var(--fm-income);
}

.card-indicator.expense {
  background: var(--fm-expense);
}

.event-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.event-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1 1 0%;
}

.event-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.event-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--fm-text-primary);
}

.status-badge {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--fm-surface-muted);
  color: var(--fm-text-muted);
  font-weight: 500;
}

.event-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--fm-text-secondary);
  flex-wrap: wrap;
  min-width: 0;
}

.account-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background: var(--fm-surface-muted);
  border-radius: 4px;
  font-size: 0.75rem;
}

.account-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.chart-focus-link {
  border: none;
  background: transparent;
  color: #0284c7;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0;
  cursor: pointer;
  max-width: 100%;
  min-width: 0;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
  text-align: left;
  line-height: 1.35;
  flex: 0 1 100%;
}

.chart-focus-link:hover {
  color: #0369a1;
  text-decoration: underline;
}

.event-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex: 0 0 auto;
}

.amount {
  font-size: 1.125rem;
  font-weight: 700;
  font-family: 'Monaco', 'Menlo', monospace; /* Number optimized font */
}

.amount.income {
  color: var(--fm-income);
}

.amount.expense {
  color: var(--fm-expense);
}

.event-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.event-card:hover .event-actions {
  opacity: 1;
}

.action-btn {
  color: var(--fm-text-muted);
}

.action-btn:hover {
  color: var(--fm-primary);
  background: var(--fm-primary-light);
}

@media (max-width: 720px) {
  .event-content {
    align-items: flex-start;
  }

  .event-right {
    max-width: 40%;
  }
}

@media (max-width: 560px) {
  .event-content {
    flex-direction: column;
    align-items: stretch;
  }

  .event-right {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    max-width: 100%;
  }

  .event-actions {
    opacity: 1;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}
</style>
