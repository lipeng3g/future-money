<template>
  <div class="chart-card">
    <h3>即将发生</h3>
    <template v-if="items.length">
      <ul>
        <li v-for="item in items" :key="item.id" :class="item.category">
          <div>
            <strong>{{ item.name }}</strong>
            <span>{{ item.date }}</span>
          </div>
          <span>{{ item.category === 'income' ? '+' : '-' }}¥{{ item.amount.toLocaleString('zh-CN') }}</span>
        </li>
      </ul>
    </template>
    <p v-else class="empty">未来 60 天暂无记录。</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DailySnapshot } from '@/types/timeline';

const props = defineProps<{ timeline: DailySnapshot[] }>();

const items = computed(() => {
  const today = new Date().toISOString().split('T')[0];
  const flattened = props.timeline.flatMap((day) =>
    day.events.map((event) => ({
      id: `${event.id}-${day.date}`,
      name: event.name,
      amount: event.amount,
      category: event.category,
      date: day.date,
    })),
  );
  return flattened
    .filter((item) => item.date >= today)
    .slice(0, 6);
});
</script>

<style scoped>
.chart-card {
  border: 1px solid var(--fm-border-subtle);
  border-radius: 16px;
  padding: 20px;
  background: var(--fm-surface);
  min-height: 200px;
  box-shadow: var(--fm-shadow-sm);
  transition: all 0.3s ease;
}

.chart-card:hover {
  box-shadow: var(--fm-shadow-md);
  transform: translateY(-2px);
}

.chart-card h3 {
  margin: 0 0 16px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--fm-text-primary);
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--fm-surface-muted);
  transition: background 0.2s;
}

li:hover {
  background: #f1f5f9;
}

li.income span:last-child {
  color: var(--fm-income);
}

li.expense span:last-child {
  color: var(--fm-expense);
}

li div {
  display: flex;
  flex-direction: column;
}

li span {
  color: var(--fm-text-secondary);
  font-size: 0.85rem;
}

li span:last-child {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  min-width: 96px;
  text-align: right;
}

.empty {
  color: var(--fm-text-secondary);
}
</style>
