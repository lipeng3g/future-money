<template>
  <article class="event-card" :class="event.category">
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

const props = defineProps<{ event: CashFlowEvent; readonly?: boolean }>();
const emit = defineEmits<{
  (e: 'toggle', payload: { id: string; enabled: boolean }): void;
  (e: 'edit', event: CashFlowEvent): void;
  (e: 'delete', event: CashFlowEvent): void;
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
      return `每月${props.event.monthlyDay ?? '某日'}`;
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
}

.event-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
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

.event-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
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
</style>
