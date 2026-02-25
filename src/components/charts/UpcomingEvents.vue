<template>
  <div class="chart-card">
    <h3>即将发生</h3>
    <template v-if="items.length">
      <ul>
        <li v-for="item in items" :key="item.id" :class="[item.category, { overridden: item.overrideAction }]">
          <div class="event-info">
            <strong>{{ item.name }}</strong>
            <span class="event-date">{{ item.date }}</span>
            <span v-if="item.overrideAction" class="override-badge" :class="item.overrideAction">
              {{ overrideLabel(item.overrideAction) }}
            </span>
          </div>
          <div class="event-right">
            <span class="event-amount">{{ item.category === 'income' ? '+' : '-' }}¥{{ item.amount.toLocaleString('zh-CN') }}</span>
            <div v-if="!store.isReadOnly && item.eventId && item.period" class="event-actions">
              <a-dropdown :trigger="['click']">
                <a-button size="small" type="text" class="action-btn">...</a-button>
                <template #overlay>
                  <a-menu @click="(info: any) => handleAction(info.key, item)">
                    <a-menu-item key="confirmed">标记已发生</a-menu-item>
                    <a-menu-item key="skipped">跳过本期</a-menu-item>
                    <a-menu-item key="modified">修改金额</a-menu-item>
                    <a-menu-item v-if="item.overrideId" key="remove">取消覆盖</a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
          </div>
        </li>
      </ul>
    </template>
    <p v-else class="empty">未来 60 天暂无记录。</p>

    <!-- 修改金额弹窗 -->
    <a-modal
      :open="modifyOpen"
      title="修改事件金额"
      ok-text="确定"
      cancel-text="取消"
      @ok="handleModifySubmit"
      @cancel="modifyOpen = false"
      destroy-on-close
    >
      <a-form layout="vertical">
        <a-form-item label="新金额">
          <a-input-number
            v-model:value="modifyAmount"
            :min="0"
            :step="100"
            addon-after="元"
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { message } from 'ant-design-vue';
import type { DailySnapshot } from '@/types/timeline';
import { useFinanceStore } from '@/stores/finance';

const props = defineProps<{ timeline: DailySnapshot[] }>();
const store = useFinanceStore();

const modifyOpen = ref(false);
const modifyAmount = ref<number | null>(null);
const modifyTarget = ref<{ eventId: string; period: string } | null>(null);

interface UpcomingItem {
  id: string;
  eventId: string;
  name: string;
  amount: number;
  category: string;
  date: string;
  period?: string;
  overrideId?: string;
  overrideAction?: string;
}

const items = computed<UpcomingItem[]>(() => {
  const today = store.todayStr;
  const flattened = props.timeline.flatMap((day) =>
    day.events.map((event) => ({
      id: `${event.id}-${day.date}`,
      eventId: event.eventId,
      name: event.name,
      amount: event.amount,
      category: event.category,
      date: day.date,
      period: event.period,
      overrideId: event.overrideId,
      overrideAction: event.overrideAction,
    })),
  );
  return flattened
    .filter((item) => item.date >= today)
    .slice(0, 6);
});

const overrideLabel = (action: string) => {
  switch (action) {
    case 'confirmed': return '已发生';
    case 'skipped': return '已跳过';
    case 'modified': return '已修改';
    default: return '';
  }
};

const handleAction = (key: string, item: UpcomingItem) => {
  if (!item.eventId || !item.period) return;

  if (key === 'confirmed') {
    store.addEventOverride(item.eventId, item.period, 'confirmed');
    message.success('已标记为已发生');
  } else if (key === 'skipped') {
    store.addEventOverride(item.eventId, item.period, 'skipped');
    message.success('已跳过本期');
  } else if (key === 'modified') {
    modifyTarget.value = { eventId: item.eventId, period: item.period };
    modifyAmount.value = item.amount;
    modifyOpen.value = true;
  } else if (key === 'remove' && item.overrideId) {
    store.removeEventOverride(item.overrideId);
    message.success('已取消覆盖');
  }
};

const handleModifySubmit = () => {
  if (!modifyTarget.value || typeof modifyAmount.value !== 'number') return;
  store.addEventOverride(modifyTarget.value.eventId, modifyTarget.value.period, 'modified', {
    amount: modifyAmount.value,
  });
  modifyOpen.value = false;
  message.success('金额已修改');
};
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

li.overridden {
  opacity: 0.7;
}

li.income .event-amount {
  color: var(--fm-income);
}

li.expense .event-amount {
  color: var(--fm-expense);
}

.event-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.event-date {
  color: var(--fm-text-secondary);
  font-size: 0.85rem;
}

.event-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.event-amount {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  min-width: 96px;
  text-align: right;
}

.event-actions {
  display: flex;
}

.action-btn {
  font-size: 1rem;
  line-height: 1;
  padding: 2px 6px;
}

.override-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.override-badge.confirmed {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.override-badge.skipped {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.override-badge.modified {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.empty {
  color: var(--fm-text-secondary);
}
</style>
