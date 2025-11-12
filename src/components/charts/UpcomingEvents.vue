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
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  padding: 16px;
  background: #fff;
  min-height: 200px;
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
  padding: 8px 12px;
  border-radius: 12px;
  background: #f9fafb;
}

li.income span:last-child {
  color: #059669;
}

li.expense span:last-child {
  color: #dc2626;
}

li div {
  display: flex;
  flex-direction: column;
}

li span {
  color: #6b7280;
  font-size: 0.85rem;
}

.empty {
  color: #6b7280;
}
</style>
