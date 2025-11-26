<template>
  <a-modal
    :open="open"
    title="余额校准历史"
    width="520px"
    :footer="null"
    @cancel="$emit('close')"
    destroy-on-close
  >
    <div v-if="snapshots.length" class="snapshot-list">
      <p class="intro">
        点击任意一条记录可以切换到对应时间点的快照视图（页面顶部会提示「历史快照」并可返回最新）。
      </p>
      <div class="snapshot-header">
        <span>日期</span>
        <span>账户</span>
        <span>余额</span>
        <span>备注</span>
      </div>
      <div
        v-for="item in snapshots"
        :key="item.id"
        class="snapshot-row"
        :class="{ latest: item.id === latestSnapshotId }"
        @click="handleRowClick(item.id)"
      >
        <span class="date">
          {{ item.date }}
          <span v-if="item.id === latestSnapshotId" class="latest-tag">最新</span>
        </span>
        <span class="account">
          <span class="dot" :style="{ background: accountColor(item.accountId) }" />
          {{ accountName(item.accountId) }}
        </span>
        <span class="balance">¥{{ item.balance.toLocaleString('zh-CN') }}</span>
        <span class="note">
          <span v-if="item.note">{{ item.note }}</span>
          <span v-else class="note-placeholder">-</span>
        </span>
      </div>
      <p class="tip">最新一条记录将作为当前预测的起点。</p>
    </div>
    <a-empty v-else description="暂无校准记录" />
  </a-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useFinanceStore } from '@/stores/finance';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const store = useFinanceStore();

const snapshots = computed(() =>
  [...store.snapshots].sort((a, b) => a.date.localeCompare(b.date)),
);

const latestSnapshotId = computed(() => store.latestSnapshot?.id ?? '');

const accountName = (accountId: string) =>
  store.accounts.find((a) => a.id === accountId)?.name ?? '未知账户';

const accountColor = (accountId: string) =>
  store.accounts.find((a) => a.id === accountId)?.color ?? '#64748b';

const handleRowClick = (id: string) => {
  const snap = store.snapshots.find((s) => s.id === id);
  if (snap) {
    // 切换到快照所属账户
    store.currentAccountId = snap.accountId;
  }
  store.setViewSnapshot(id);
  emit('close');
};
</script>

<style scoped>
.snapshot-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.snapshot-header,
.snapshot-row {
  display: grid;
  grid-template-columns: 120px 140px 140px 1fr;
  gap: 8px;
  padding: 6px 0;
  font-size: 0.85rem;
}

.snapshot-header {
  color: #6b7280;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 500;
}

.snapshot-row {
  border-bottom: 1px solid #f3f4f6;
}

.snapshot-row.latest {
  background: rgba(37, 99, 235, 0.03);
}

.snapshot-row .balance {
  font-weight: 600;
  color: #0f172a;
}

.note {
  color: #6b7280;
}

.note-placeholder {
  color: #cbd5e1;
}

.tip {
  margin-top: 8px;
  font-size: 0.75rem;
  color: #9ca3af;
}

.intro {
  margin: 0 0 8px;
  font-size: 0.8rem;
  color: #9ca3af;
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

.account {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}
</style>
