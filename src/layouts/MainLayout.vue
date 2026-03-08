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
      <ChartArea
        :focus-date="balanceChartFocusDate"
        :focus-nonce="balanceChartFocusNonce"
        @openDrawer="drawerVisible = true"
        @focus-events-by-date="handleFocusEventsByDate"
      />
    </div>

    <!-- 右侧抽屉 -->
    <a-drawer
      v-model:open="drawerVisible"
      title="现金流事件管理"
      placement="right"
      width="480"
      :bodyStyle="{ padding: '24px' }"
      @close="clearEventFocus"
    >
      <EventPanel
        v-if="drawerVisible"
        :focus-state="eventFocusState"
        @clear-focus="clearEventFocus"
        @focus-chart-date="handleFocusChartDate"
      />
    </a-drawer>

    <!-- 快速添加表单 -->
    <EventFormModal
      v-if="modalOpen"
      :open="modalOpen"
      :event="null"
      @submit="handleSubmit"
      @cancel="modalOpen = false"
    />
  </section>
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue';
import { message } from 'ant-design-vue';
import { useFinanceStore } from '@/stores/finance';
import ChartArea from '@/components/charts/ChartArea.vue';
import type { EventFormValues, NewCashFlowEvent } from '@/types/event';
import type { EventListFocusState } from '@/utils/event-focus';
import { buildEventListFocusState } from '@/utils/event-focus';
import AppIcon from '@/components/common/AppIcon.vue';

const EventPanel = defineAsyncComponent(() => import('@/components/events/EventPanel.vue'));
const EventFormModal = defineAsyncComponent(() => import('@/components/events/EventFormModal.vue'));

const store = useFinanceStore();
const drawerVisible = ref(false);
const modalOpen = ref(false);
const eventFocusState = ref<EventListFocusState | null>(null);
const balanceChartFocusDate = ref<string | null>(null);
const balanceChartFocusNonce = ref(0);

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

const clearEventFocus = () => {
  eventFocusState.value = null;
};

const handleFocusChartDate = (date: string) => {
  balanceChartFocusDate.value = date;
  balanceChartFocusNonce.value += 1;
};

const handleFocusEventsByDate = (date: string) => {
  const focusState = buildEventListFocusState(store.timeline, store.visibleEvents, date, store.accounts);
  if (!focusState) {
    message.info('这个日期没有对应的规则事件');
    return;
  }
  eventFocusState.value = focusState;
  drawerVisible.value = true;
};

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
  width: 56px;
  height: 56px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  transition: background 0.2s, box-shadow 0.2s;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.floating-add-button:hover {
  background: #4338ca;
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
}

.floating-add-button:active {
  background: #3730a3;
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
