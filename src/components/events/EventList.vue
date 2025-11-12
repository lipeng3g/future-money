<template>
  <div class="event-list">
    <template v-if="events.length">
      <EventCard
        v-for="event in events"
        :key="event.id"
        :event="event"
        @edit="$emit('edit', event)"
        @delete="$emit('delete', event)"
        @toggle="(payload) => $emit('toggle', payload)"
      />
    </template>
    <div v-else class="empty-state">
      <div class="empty-icon">
        <AppIcon name="chart" :size="64" :stroke-width="1.4" />
      </div>
      <h3>还没有现金流事件</h3>
      <p>添加工资、房贷、年终奖等事件，预测未来余额走势</p>
      <div class="empty-actions">
        <p class="hint">点击右上角「<strong>载入示例</strong>」快速体验</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CashFlowEvent } from '@/types/event';
import EventCard from './EventCard.vue';
import AppIcon from '@/components/common/AppIcon.vue';

defineProps<{ events: CashFlowEvent[] }>();
defineEmits<{
  (e: 'edit', event: CashFlowEvent): void;
  (e: 'delete', event: CashFlowEvent): void;
  (e: 'toggle', payload: { id: string; enabled: boolean }): void;
}>();
</script>

<style scoped>
.event-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
}

.empty-icon {
  width: 72px;
  height: 72px;
  margin-bottom: 16px;
  border-radius: 16px;
  background: rgba(59, 130, 246, 0.08);
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon :deep(.app-icon) {
  width: 48px;
  height: 48px;
}

.empty-state h3 {
  margin: 0 0 8px;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
}

.empty-state p {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;
}

.empty-actions {
  margin-top: 24px;
}

.hint {
  color: #3b82f6;
  font-size: 0.875rem;
}

.hint strong {
  font-weight: 600;
}
</style>
