<template>
  <div v-if="mode !== 'hidden'" id="reconciliation-banner" class="setup-banner" :class="mode">
    <!-- 引导清单模式 -->
    <template v-if="mode === 'onboarding'">
      <div class="banner-title">
        <span class="banner-icon setup">?</span>
        <span>开始使用 FutureMoney</span>
      </div>
      <div class="checklist">
        <div class="checklist-item" :class="{ done: hasEvents }">
          <span class="check-mark">{{ hasEvents ? '✓' : '1' }}</span>
          <span class="check-text">
            <strong>添加现金流事件</strong>
            <span class="check-desc">定义您的收入和支出规则（工资、房租等）</span>
          </span>
          <a-button
            v-if="!hasEvents"
            type="primary"
            size="small"
            ghost
            @click="$emit('openDrawer')"
          >去添加</a-button>
          <span v-else class="done-label">已完成</span>
        </div>
        <div class="checklist-item" :class="{ done: hasReconciliation }">
          <span class="check-mark">{{ hasReconciliation ? '✓' : '2' }}</span>
          <span class="check-text">
            <strong>首次对账</strong>
            <span class="check-desc">设定账户当前的真实余额</span>
          </span>
          <a-button
            v-if="!hasReconciliation"
            type="primary"
            size="small"
            ghost
            @click="$emit('reconcile')"
          >去对账</a-button>
          <span v-else class="done-label">已完成</span>
        </div>
      </div>
      <p class="banner-footer">完成以上两步后，系统将为您生成现金流预测。顺序不限。</p>
    </template>

    <!-- 对账提醒模式 -->
    <template v-if="mode === 'reminder'">
      <div class="banner-content">
        <span class="banner-icon reminder">!</span>
        <span class="banner-text">
          您上次对账是 {{ store.latestReconciliation!.date }}，距今已过 {{ daysSince }} 天。建议对账以确保数据准确。
        </span>
        <a-button type="primary" size="small" @click="$emit('reconcile')">立即对账</a-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useFinanceStore } from '@/stores/finance';

const store = useFinanceStore();

defineEmits<{
  (e: 'reconcile'): void;
  (e: 'openDrawer'): void;
}>();

const hasEvents = computed(() => store.visibleEvents.length > 0);
const hasReconciliation = computed(() => !!store.latestReconciliation);

const mode = computed<'onboarding' | 'reminder' | 'hidden'>(() => {
  if (store.isMultiAccountView) return 'hidden';
  // 缺少事件或对账记录 → 引导模式
  if (!hasEvents.value || !hasReconciliation.value) return 'onboarding';
  // 都有但需要对账 → 提醒模式
  if (store.needsReconciliation) return 'reminder';
  return 'hidden';
});

const daysSince = computed(() => {
  if (!store.latestReconciliation) return 0;
  const last = new Date(store.latestReconciliation.date);
  const today = new Date(store.todayStr);
  return Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
});
</script>

<style scoped>
.setup-banner {
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 16px;
}

.setup-banner.onboarding {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.setup-banner.reminder {
  background: #fefce8;
  border: 1px solid #fde68a;
}

.banner-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1e3a5f;
  margin-bottom: 14px;
}

.banner-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: white;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.banner-icon.setup {
  background: #3b82f6;
}

.banner-icon.reminder {
  background: #f59e0b;
}

.checklist {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  border: 1px solid rgba(147, 197, 253, 0.4);
  transition: all 0.2s;
}

.checklist-item.done {
  background: rgba(255, 255, 255, 0.5);
  border-color: rgba(16, 185, 129, 0.3);
}

.check-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #e0e7ff;
  color: #4338ca;
  font-weight: 700;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.checklist-item.done .check-mark {
  background: #d1fae5;
  color: #059669;
}

.check-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.check-text strong {
  font-size: 0.85rem;
  color: #1e293b;
}

.check-desc {
  font-size: 0.75rem;
  color: #64748b;
}

.done-label {
  font-size: 0.75rem;
  color: #059669;
  font-weight: 600;
}

.banner-footer {
  margin: 12px 0 0;
  font-size: 0.75rem;
  color: #64748b;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.banner-text {
  flex: 1;
  font-size: 0.85rem;
  color: #92400e;
}
</style>
