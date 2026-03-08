<template>
  <a-modal
    :open="open"
    title="多账户视图"
    :ok-button-props="{ disabled: !canConfirm }"
    ok-text="确定"
    cancel-text="取消"
    @ok="handleOk"
    @cancel="$emit('cancel')"
    destroy-on-close
  >
    <div class="selection-meta">
      <span class="meta-label">基准对账日</span>
      <strong class="meta-value">{{ anchorDate ?? '未选择' }}</strong>
    </div>

    <div class="account-grid">
      <div
        v-for="item in accountCards"
        :key="item.id"
        class="account-card"
        :class="{ selected: item.selected, disabled: !item.selectable && !item.selected }"
        @click="handleCardClick(item.id)"
      >
        <div class="card-top">
          <a-checkbox
            :checked="item.selected"
            :disabled="!item.selectable && !item.selected"
            @click.stop
            @change="handleCheckboxChange(item.id, $event)"
          />
          <span class="dot" :style="{ background: item.color }" />
          <div class="name-wrap">
            <span class="name">{{ item.name }}</span>
            <span v-if="item.typeLabel" class="type">{{ item.typeLabel }}</span>
          </div>
          <span class="status" :class="item.statusClass">{{ item.statusText }}</span>
        </div>

        <div class="card-details">
          <div class="detail-row">
            <span>最新对账日</span>
            <strong>{{ item.reconciliationDate ?? '-' }}</strong>
          </div>
          <div class="detail-row">
            <span>最新对账余额</span>
            <strong>{{ item.reconciliationBalanceLabel }}</strong>
          </div>
          <div class="detail-row">
            <span>距今天数</span>
            <strong>{{ item.daysSinceLabel }}</strong>
          </div>
        </div>

        <p v-if="item.disabledReason" class="disabled-reason">{{ item.disabledReason }}</p>
      </div>
    </div>

    <p class="hint" :class="{ 'hint-warning': !!selectionIssue }">
      {{ selectionIssue || '请选择至少两个最新对账日一致的账户进入多账户汇总视图。' }}
    </p>
  </a-modal>
</template>

<script setup lang="ts">
import dayjs from 'dayjs';
import { computed, ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import type { AccountConfig } from '@/types/account';
import { formatLocalISODate } from '@/utils/date';

interface LatestReconciliationBrief {
  date: string;
  balance: number;
}

interface Props {
  open: boolean;
  accounts: AccountConfig[];
  initialSelected: string[];
  latestReconciliationMap: Record<string, LatestReconciliationBrief | null | undefined>;
  today?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'confirm', ids: string[]): void;
  (e: 'cancel'): void;
}>();

const selectedIds = ref<string[]>([]);
const anchorAccountId = ref<string | null>(null);

const todayStr = computed(() => props.today ?? formatLocalISODate());

const formatMoney = (amount: number) => `¥${amount.toLocaleString('zh-CN')}`;

const getLatestReconciliation = (accountId: string): LatestReconciliationBrief | null =>
  props.latestReconciliationMap[accountId] ?? null;

const anchorDate = computed<string | null>(() => {
  if (!anchorAccountId.value) return null;
  return getLatestReconciliation(anchorAccountId.value)?.date ?? null;
});

const accountCards = computed(() => {
  return props.accounts.map((acc) => {
    const latestRecon = getLatestReconciliation(acc.id);
    const hasReconciliation = !!latestRecon;
    const selected = selectedIds.value.includes(acc.id);
    let selectable = hasReconciliation;
    let disabledReason = '';

    if (!hasReconciliation) {
      selectable = false;
      disabledReason = '未完成首次对账，暂不可参与多账户汇总';
    } else if (anchorDate.value && latestRecon.date !== anchorDate.value && !selected) {
      selectable = false;
      disabledReason = `最新对账日 ${latestRecon.date} 与基准日 ${anchorDate.value} 不一致`;
    }

    let statusText = '可选择';
    let statusClass = 'status-ready';
    if (!hasReconciliation) {
      statusText = '需先对账';
      statusClass = 'status-missing';
    } else if (selected) {
      statusText = '已选择';
      statusClass = 'status-selected';
    } else if (!selectable) {
      statusText = '日期不一致';
      statusClass = 'status-locked';
    }

    const daysSince = latestRecon
      ? dayjs(todayStr.value).startOf('day').diff(dayjs(latestRecon.date).startOf('day'), 'day')
      : null;

    return {
      id: acc.id,
      name: acc.name,
      typeLabel: acc.typeLabel,
      color: acc.color || '#64748b',
      selected,
      selectable,
      disabledReason,
      statusText,
      statusClass,
      reconciliationDate: latestRecon?.date ?? null,
      reconciliationBalanceLabel: latestRecon ? formatMoney(latestRecon.balance) : '-',
      daysSinceLabel: daysSince === null ? '-' : `${daysSince} 天`,
    };
  });
});

const selectionIssue = computed(() => {
  if (selectedIds.value.length < 2) {
    return '至少选择两个账户';
  }
  const selectedCards = accountCards.value.filter((item) => selectedIds.value.includes(item.id));
  if (selectedCards.some((item) => !item.reconciliationDate)) {
    return '存在未对账账户，请先完成首次对账';
  }
  const dates = new Set(selectedCards.map((item) => item.reconciliationDate));
  if (dates.size > 1) {
    return '所选账户最新对账日不一致，无法汇总';
  }
  return '';
});

const canConfirm = computed(() => !selectionIssue.value);

const syncSelectionByInitial = () => {
  const knownIds = new Set(props.accounts.map((acc) => acc.id));
  const initialIds = props.initialSelected.filter((id) => knownIds.has(id));
  const firstReconId = initialIds.find((id) => !!getLatestReconciliation(id));

  if (!firstReconId) {
    selectedIds.value = [];
    anchorAccountId.value = null;
    return;
  }

  const baseDate = getLatestReconciliation(firstReconId)?.date;
  const filtered = initialIds.filter((id) => {
    const recon = getLatestReconciliation(id);
    return !!recon && recon.date === baseDate;
  });

  selectedIds.value = filtered.length ? filtered : [firstReconId];
  anchorAccountId.value = selectedIds.value[0] ?? null;
};

watch(
  () => props.open,
  (open) => {
    if (open) {
      syncSelectionByInitial();
    }
  },
  { immediate: false },
);

const toggleAccount = (id: string, checked: boolean) => {
  const target = accountCards.value.find((item) => item.id === id);
  if (!target) return;

  if (checked) {
    if (!target.selectable && !target.selected) return;
    if (!selectedIds.value.includes(id)) {
      selectedIds.value = [...selectedIds.value, id];
    }
    if (!anchorAccountId.value) {
      anchorAccountId.value = id;
    }
    return;
  }

  selectedIds.value = selectedIds.value.filter((itemId) => itemId !== id);
  if (anchorAccountId.value === id) {
    anchorAccountId.value = selectedIds.value[0] ?? null;
  }
};

const handleCheckboxChange = (id: string, event: { target: { checked: boolean } }) => {
  toggleAccount(id, event.target.checked);
};

const handleCardClick = (id: string) => {
  const target = accountCards.value.find((item) => item.id === id);
  if (!target) return;
  toggleAccount(id, !target.selected);
};

const handleOk = () => {
  if (!canConfirm.value) {
    if (selectionIssue.value) {
      message.warning(selectionIssue.value);
    }
    return;
  }
  emit('confirm', selectedIds.value);
};
</script>

<style scoped>
.selection-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.meta-label {
  font-size: 0.8rem;
  color: #64748b;
}

.meta-value {
  font-size: 0.9rem;
  color: #1e293b;
}

.account-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  max-height: 420px;
  overflow-y: auto;
  padding-right: 2px;
}

.account-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 14px;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}

.account-card:hover {
  border-color: #c7d2fe;
  box-shadow: 0 3px 10px rgba(79, 70, 229, 0.08);
}

.account-card.selected {
  border-color: #6366f1;
  background: #f8f9ff;
}

.account-card.disabled {
  cursor: not-allowed;
  background: #f8fafc;
  border-color: #e2e8f0;
  box-shadow: none;
}

.card-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.name-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.name {
  font-weight: 600;
  color: #0f172a;
}

.type {
  font-size: 0.75rem;
  color: #64748b;
}

.status {
  font-size: 0.72rem;
  border-radius: 999px;
  padding: 2px 8px;
  border: 1px solid transparent;
  white-space: nowrap;
}

.status-ready {
  color: #334155;
  background: #f8fafc;
  border-color: #e2e8f0;
}

.status-selected {
  color: #3730a3;
  background: #eef2ff;
  border-color: #c7d2fe;
}

.status-locked {
  color: #92400e;
  background: #fffbeb;
  border-color: #fde68a;
}

.status-missing {
  color: #991b1b;
  background: #fef2f2;
  border-color: #fecaca;
}

.card-details {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px 12px;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.75rem;
  color: #64748b;
}

.detail-row strong {
  font-size: 0.82rem;
  color: #1e293b;
}

.disabled-reason {
  margin: 8px 0 0;
  font-size: 0.74rem;
  color: #b45309;
}

.hint {
  margin-top: 10px;
  font-size: 0.78rem;
  color: #64748b;
}

.hint-warning {
  color: #b45309;
}

@media (max-width: 680px) {
  .card-details {
    grid-template-columns: 1fr;
  }
}
</style>
