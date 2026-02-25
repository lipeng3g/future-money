<template>
  <a-modal
    :open="open"
    title="对账历史"
    width="640px"
    :footer="null"
    @cancel="$emit('close')"
    destroy-on-close
  >
    <div v-if="reconciliationList.length" class="recon-list">
      <p class="intro">
        查看所有对账记录。点击可展开查看该次对账的账本明细。
      </p>
      <div
        v-for="recon in reconciliationList"
        :key="recon.id"
        class="recon-item"
        :class="{ expanded: expandedId === recon.id, latest: recon.id === latestReconId }"
      >
        <div class="recon-header" @click="toggleExpand(recon.id)">
          <span class="recon-date">
            {{ recon.date }}
            <span v-if="recon.id === latestReconId" class="latest-tag">最新</span>
          </span>
          <span class="recon-balance">¥{{ recon.balance.toLocaleString('zh-CN') }}</span>
          <span class="recon-entries-count">{{ getEntriesCount(recon.id) }} 条</span>
          <span class="recon-adjustment" v-if="getAdjustment(recon.id) !== 0" :class="{ positive: getAdjustment(recon.id) > 0, negative: getAdjustment(recon.id) < 0 }">
            调整: {{ getAdjustment(recon.id) >= 0 ? '+' : '' }}¥{{ getAdjustment(recon.id).toLocaleString('zh-CN') }}
          </span>
          <span class="recon-note" v-if="recon.note">{{ recon.note }}</span>
          <span class="expand-icon">{{ expandedId === recon.id ? '▼' : '▶' }}</span>
        </div>

        <!-- 展开：账本条目列表 -->
        <div v-if="expandedId === recon.id" class="entries-detail">
          <div class="entries-header">
            <span>日期</span>
            <span>名称</span>
            <span>金额</span>
            <span>来源</span>
            <span>操作</span>
          </div>
          <div
            v-for="entry in getEntries(recon.id)"
            :key="entry.id"
            class="entry-row"
            :class="{ adjustment: entry.source === 'adjustment' }"
          >
            <span>{{ entry.date }}</span>
            <span>
              <template v-if="editingEntryId === entry.id">
                <a-input v-model:value="editName" size="small" style="width: 100px" />
              </template>
              <template v-else>{{ entry.name }}</template>
            </span>
            <span :class="entry.category">
              <template v-if="editingEntryId === entry.id">
                <a-input-number v-model:value="editAmount" :min="0" size="small" style="width: 100px" />
              </template>
              <template v-else>
                {{ entry.category === 'income' ? '+' : '-' }}¥{{ entry.amount.toLocaleString('zh-CN') }}
              </template>
            </span>
            <span class="source-tag">{{ sourceLabel(entry.source) }}</span>
            <span class="entry-actions" v-if="entry.source !== 'adjustment'">
              <template v-if="editingEntryId === entry.id">
                <a-button size="small" type="link" @click="saveEntry(entry.id)">保存</a-button>
                <a-button size="small" type="link" @click="cancelEdit">取消</a-button>
              </template>
              <template v-else>
                <a-button size="small" type="link" @click="startEdit(entry)">编辑</a-button>
                <a-button size="small" type="link" danger @click="handleDelete(entry.id)">删除</a-button>
              </template>
            </span>
            <span v-else class="entry-actions adjustment-label">自动</span>
          </div>

          <!-- 添加手动条目 -->
          <div class="add-entry-row">
            <a-input v-model:value="addName" placeholder="名称" size="small" style="width: 100px" />
            <a-input-number v-model:value="addAmount" placeholder="金额" :min="0" size="small" style="width: 100px" />
            <a-select v-model:value="addCategory" size="small" style="width: 80px">
              <a-select-option value="income">收入</a-select-option>
              <a-select-option value="expense">支出</a-select-option>
            </a-select>
            <a-date-picker v-model:value="addDate" size="small" style="width: 130px" />
            <a-button size="small" type="primary" :disabled="!addName || !addAmount" @click="handleAdd(recon.id)">添加</a-button>
          </div>
        </div>
      </div>
    </div>
    <a-empty v-else description="暂无对账记录" />
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Dayjs } from 'dayjs';
import { useFinanceStore } from '@/stores/finance';
import type { LedgerEntry } from '@/types/reconciliation';

defineProps<{ open: boolean }>();
defineEmits<{ (e: 'close'): void }>();

const store = useFinanceStore();

const expandedId = ref<string | null>(null);
const editingEntryId = ref<string | null>(null);
const editName = ref('');
const editAmount = ref<number | null>(null);

// 添加条目
const addName = ref('');
const addAmount = ref<number | null>(null);
const addCategory = ref<'income' | 'expense'>('expense');
const addDate = ref<Dayjs | null>(null);

const reconciliationList = computed(() =>
  [...store.sortedReconciliations].reverse(),
);

const latestReconId = computed(() => store.latestReconciliation?.id ?? '');

const toggleExpand = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id;
  editingEntryId.value = null;
};

const getEntries = (reconId: string): LedgerEntry[] => {
  return store.accountLedgerEntries
    .filter((e) => e.reconciliationId === reconId)
    .sort((a, b) => a.date.localeCompare(b.date));
};

const getEntriesCount = (reconId: string): number => {
  return store.accountLedgerEntries.filter((e) => e.reconciliationId === reconId).length;
};

const getAdjustment = (reconId: string): number => {
  const adj = store.accountLedgerEntries.find(
    (e) => e.reconciliationId === reconId && e.source === 'adjustment',
  );
  if (!adj) return 0;
  return adj.category === 'income' ? adj.amount : -adj.amount;
};

const sourceLabel = (source: string) => {
  switch (source) {
    case 'rule': return '规则';
    case 'manual': return '手动';
    case 'adjustment': return '调整';
    default: return source;
  }
};

const startEdit = (entry: LedgerEntry) => {
  editingEntryId.value = entry.id;
  editName.value = entry.name;
  editAmount.value = entry.amount;
};

const cancelEdit = () => {
  editingEntryId.value = null;
};

const saveEntry = (id: string) => {
  if (editName.value && typeof editAmount.value === 'number') {
    store.updateLedgerEntry(id, { name: editName.value, amount: editAmount.value });
  }
  editingEntryId.value = null;
};

const handleDelete = (id: string) => {
  store.deleteLedgerEntry(id);
};

const handleAdd = (reconId: string) => {
  if (!addName.value || typeof addAmount.value !== 'number') return;
  const recon = store.reconciliations.find((r) => r.id === reconId);
  if (!recon) return;

  const dateStr = addDate.value
    ? addDate.value.format('YYYY-MM-DD')
    : recon.date;

  store.addManualLedgerEntry(reconId, {
    name: addName.value,
    amount: addAmount.value,
    category: addCategory.value,
    date: dateStr,
  });

  addName.value = '';
  addAmount.value = null;
  addCategory.value = 'expense';
  addDate.value = null;
};
</script>

<style scoped>
.recon-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.intro {
  margin: 0 0 12px;
  font-size: 0.8rem;
  color: #9ca3af;
}

.recon-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.recon-item.latest {
  border-color: rgba(37, 99, 235, 0.3);
}

.recon-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.2s;
}

.recon-header:hover {
  background: #f8fafc;
}

.recon-date {
  font-weight: 600;
  min-width: 100px;
}

.latest-tag {
  margin-left: 6px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.12);
  color: #2563eb;
  font-size: 0.7rem;
  font-weight: 600;
}

.recon-balance {
  font-weight: 600;
  color: #0f172a;
  min-width: 100px;
}

.recon-entries-count {
  color: #6b7280;
}

.recon-adjustment {
  font-size: 0.8rem;
}

.recon-adjustment.positive {
  color: #059669;
}

.recon-adjustment.negative {
  color: #dc2626;
}

.recon-note {
  color: #9ca3af;
  font-size: 0.8rem;
  flex: 1;
  text-align: right;
}

.expand-icon {
  color: #9ca3af;
  font-size: 0.7rem;
}

.entries-detail {
  border-top: 1px solid #f3f4f6;
  padding: 12px;
  background: #fafbfc;
}

.entries-header,
.entry-row {
  display: grid;
  grid-template-columns: 100px 1fr 120px 60px 100px;
  gap: 8px;
  padding: 6px 8px;
  font-size: 0.8rem;
  align-items: center;
}

.entries-header {
  color: #6b7280;
  font-weight: 500;
  border-bottom: 1px solid #e5e7eb;
}

.entry-row {
  border-bottom: 1px solid #f3f4f6;
}

.entry-row:last-child {
  border-bottom: none;
}

.entry-row.adjustment {
  background: #fffbeb;
  font-style: italic;
}

.entry-row .income {
  color: #059669;
}

.entry-row .expense {
  color: #dc2626;
}

.source-tag {
  padding: 2px 6px;
  border-radius: 4px;
  background: #f3f4f6;
  font-size: 0.7rem;
  text-align: center;
}

.entry-actions {
  display: flex;
  gap: 2px;
}

.adjustment-label {
  color: #9ca3af;
  font-size: 0.75rem;
}

.add-entry-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}
</style>
