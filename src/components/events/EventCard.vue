<template>
  <article class="event-card" :class="event.category">
    <div class="corner-mark" :class="event.category"></div>
    <div class="event-content">
      <div class="event-info">
        <h3>
          {{ event.name }}
          <span v-if="!event.enabled" class="badge">已暂停</span>
        </h3>
        <p class="meta">{{ recurrenceLabel }}</p>
        <div class="amount" :class="event.category">{{ amountLabel }}</div>
      </div>
      <div class="event-actions">
        <a-switch :checked="event.enabled" size="small" @change="handleToggle" />
        <a-button type="text" size="small" @click="$emit('edit', event)">
          <template #icon>
            <AppIcon name="edit" :size="16" />
          </template>
        </a-button>
        <a-button type="text" size="small" danger @click="$emit('delete', event)">
          <template #icon>
            <AppIcon name="delete" :size="16" />
          </template>
        </a-button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CashFlowEvent } from '@/types/event';
import AppIcon from '@/components/common/AppIcon.vue';

const props = defineProps<{ event: CashFlowEvent }>();
const emit = defineEmits<{
  (e: 'toggle', payload: { id: string; enabled: boolean }): void;
  (e: 'edit', event: CashFlowEvent): void;
  (e: 'delete', event: CashFlowEvent): void;
}>();

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
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 8px;
  padding: 12px 16px;
  background: white;
  transition: all 0.2s ease;
  overflow: hidden;
}

.event-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-color: rgba(15, 23, 42, 0.12);
}

/* 右上角三角形标记 */
.corner-mark {
  position: absolute;
  top: 0;
  right: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 32px 32px 0;
}

.corner-mark.income {
  border-color: transparent #10b981 transparent transparent;
  opacity: 0.85;
}

.corner-mark.expense {
  border-color: transparent #ef4444 transparent transparent;
  opacity: 0.85;
}

.event-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.event-info {
  flex: 1;
  min-width: 0;
}

.event-info h3 {
  margin: 0 0 4px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #111827;
}

.meta {
  margin: 0 0 6px;
  font-size: 0.8rem;
  color: #9ca3af;
}

.amount {
  font-size: 1.1rem;
  font-weight: 700;
  margin-top: 2px;
}

.amount.income {
  color: #10b981;
}

.amount.expense {
  color: #ef4444;
}

.event-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.event-actions :deep(.ant-btn) {
  min-width: 28px;
  height: 28px;
  padding: 0 4px;
}

.badge {
  margin-left: 6px;
  font-size: 0.7rem;
  font-weight: 500;
  background: rgba(156, 163, 175, 0.15);
  padding: 2px 6px;
  border-radius: 8px;
  color: #6b7280;
}
</style>
