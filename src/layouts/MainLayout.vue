<template>
  <section class="main-layout">
    <!-- 右下角快速添加按钮（仅在可编辑单账户视图下显示） -->
    <button
      v-if="!store.isReadOnly"
      id="floating-add-button"
      class="floating-add-button"
      @click="modalOpen = true"
      title="快速添加现金流事件"
    >
      <span class="add-icon">
        <AppIcon name="plus" :size="28" :stroke-width="1.8" />
      </span>
    </button>

    <!-- 主内容区 -->
    <div class="main-content">
      <ChartArea @openDrawer="drawerVisible = true" />
    </div>

    <!-- 右侧抽屉 -->
    <a-drawer
      v-model:open="drawerVisible"
      title="现金流事件管理"
      placement="right"
      width="480"
      :bodyStyle="{ padding: '24px' }"
    >
      <EventPanel />
    </a-drawer>

    <!-- 快速添加表单 -->
    <EventFormModal
      :open="modalOpen"
      :event="null"
      @submit="handleSubmit"
      @cancel="modalOpen = false"
    />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { message } from 'ant-design-vue';
import { useFinanceStore } from '@/stores/finance';
import EventPanel from '@/components/events/EventPanel.vue';
import EventFormModal from '@/components/events/EventFormModal.vue';
import ChartArea from '@/components/charts/ChartArea.vue';
import type { EventFormValues, NewCashFlowEvent } from '@/types/event';
import AppIcon from '@/components/common/AppIcon.vue';

const store = useFinanceStore();
const drawerVisible = ref(false);
const modalOpen = ref(false);

const mapValuesToPayload = (values: EventFormValues): NewCashFlowEvent => ({
  accountId: store.account.id,
  name: values.name.trim(),
  amount: Number(values.amount) || 0,
  category: values.category,
  type: values.type,
  startDate: values.startDate,
  endDate: values.endDate,
  onceDate: values.onceDate,
  monthlyDay: values.monthlyDay,
  yearlyMonth: values.yearlyMonth,
  yearlyDay: values.yearlyDay,
  notes: values.notes,
  color: values.color,
  enabled: values.enabled,
});

const handleSubmit = (values: EventFormValues) => {
  const result = store.addEvent(mapValuesToPayload(values));
  if (result.success) {
    message.success('已添加事件');
    modalOpen.value = false;
  } else {
    message.error(result.errors?.join('；') ?? '添加失败');
  }
};
</script>

<style scoped>
.main-layout {
  flex: 1;
  padding: 32px 48px;
  background-color: var(--fm-bg-app);
  min-height: 0;
  position: relative;
}

.main-content {
  width: 100%;
}

.floating-add-button {
  position: fixed;
  right: 48px;
  bottom: 48px;
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 10px 25px rgba(79, 70, 229, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.floating-add-button::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
  opacity: 0;
  animation: pulse 2s ease-in-out infinite;
  z-index: -1;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0;
    transform: scale(1);
  }
  50% {
    opacity: 0.3;
    transform: scale(1.15);
  }
}

.floating-add-button:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 15px 35px rgba(79, 70, 229, 0.5);
}

.floating-add-button:active {
  transform: translateY(-2px) scale(1.02);
}

.add-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.add-icon :deep(.app-icon) {
  width: 28px;
  height: 28px;
}
</style>
