<template>
  <div class="chart-card">
    <h3>即将发生</h3>
    <template v-if="items.length">
      <ul>
        <li v-for="item in items" :key="item.id" :class="[item.category, { overridden: item.overrideAction }]">
          <div class="event-info">
            <div class="event-header">
              <span class="event-indicator"></span>
              <strong class="event-name">{{ item.name }}</strong>
              <span v-if="showAccountTag && item.accountLabel" class="account-tag">
                <span class="account-dot" :style="{ background: item.accountColor }"></span>
                {{ item.accountLabel }}
              </span>
            </div>
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
import { buildUpcomingItems, type UpcomingItem } from '@/utils/upcoming-items';

const props = defineProps<{ timeline: DailySnapshot[] }>();
const store = useFinanceStore();

const modifyOpen = ref(false);
const modifyAmount = ref<number | null>(null);
const modifyTarget = ref<{ eventId: string; period: string } | null>(null);

const accountMap = computed(() => new Map(store.accounts.map((account) => [account.id, account])));
const showAccountTag = computed(() => store.isMultiAccountView);
const items = computed<Array<UpcomingItem & { accountLabel?: string; accountColor?: string }>>(() => (
  buildUpcomingItems(props.timeline, store.todayStr).map((item) => {
    const account = item.accountId ? accountMap.value.get(item.accountId) : undefined;
    return {
      ...item,
      accountLabel: account?.name ?? item.accountId ?? '',
      accountColor: account?.color ?? '#64748b',
    };
  })
));

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
  border-radius: 20px;
  padding: 24px;
  background: var(--fm-surface);
  box-shadow: var(--fm-shadow-sm);
  transition: box-shadow 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
  z-index: 1;
}

.chart-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: transparent;
  transition: opacity 0.3s ease;
  z-index: -1;
  border-radius: 20px 20px 0 0;
}

.chart-card:hover {
  box-shadow: var(--fm-shadow-md);
}

.chart-card h3 {
  margin: 0 0 20px;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--fm-text-primary);
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-radius: 12px;
  background: transparent;
  border-bottom: 1px solid var(--fm-border-subtle);
  transition: all 0.2s ease;
  position: relative;
  gap: 12px;
}

li:last-child {
  border-bottom: none;
}

li:hover {
  background: var(--fm-surface-muted);
  transform: translateX(4px);
}

li.overridden {
  opacity: 0.5;
}

li.income .event-indicator {
  background-color: var(--fm-income);
}

li.expense .event-indicator {
  background-color: var(--fm-expense);
}

li.income .event-amount {
  color: var(--fm-income);
}

li.expense .event-amount {
  color: var(--fm-text-primary);
  font-weight: 600;
}

.event-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.event-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.event-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 4px rgba(0,0,0,0.1);
}

.event-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--fm-text-primary);
}

.account-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background: var(--fm-surface-muted);
  border-radius: 999px;
  font-size: 0.72rem;
  color: var(--fm-text-secondary);
}

.account-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.event-date {
  color: var(--fm-text-secondary);
  font-size: 0.8rem;
  margin-left: 16px;
}

.event-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.event-amount {
  font-family: 'SF Pro Rounded', ui-monospace, sans-serif;
  font-size: 1.05rem;
  min-width: 100px;
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
