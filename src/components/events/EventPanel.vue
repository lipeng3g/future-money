<template>
  <section class="event-panel">
    <header class="panel-header">
      <div>
        <h2>现金流事件</h2>
        <p>维护工资、信用卡、房贷、年终奖等所有固定/一次性收支。</p>
      </div>
      <div class="panel-actions">
        <a-button @click="loadSamples">载入示例</a-button>
        <a-button type="primary" @click="openCreator">添加事件</a-button>
      </div>
    </header>

    <EventList
      :events="events"
      @edit="openEditor"
      @delete="confirmDelete"
      @toggle="handleToggle"
    />

    <EventFormModal
      :open="modalOpen"
      :event="editingEvent"
      @submit="handleSubmit"
      @cancel="closeModal"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, h } from 'vue';
import { Modal, message } from 'ant-design-vue';
import EventList from '@/components/events/EventList.vue';
import EventFormModal from '@/components/events/EventFormModal.vue';
import type { CashFlowEvent, EventFormValues, NewCashFlowEvent } from '@/types/event';
import { useFinanceStore } from '@/stores/finance';

const store = useFinanceStore();
const modalOpen = ref(false);
const editingEvent = ref<CashFlowEvent | null>(null);
const events = computed(() => store.events);

const mapValuesToPayload = (values: EventFormValues): NewCashFlowEvent => ({
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

const openCreator = () => {
  editingEvent.value = null;
  modalOpen.value = true;
};

const openEditor = (event: CashFlowEvent) => {
  editingEvent.value = event;
  modalOpen.value = true;
};

const closeModal = () => {
  modalOpen.value = false;
};

const handleSubmit = (values: EventFormValues) => {
  if (editingEvent.value) {
    const result = store.updateEvent(editingEvent.value.id, mapValuesToPayload(values));
    if (result.success) {
      message.success('已更新事件');
      modalOpen.value = false;
    } else {
      message.error(result.errors?.join('；') ?? result.message ?? '更新失败');
    }
  } else {
    const result = store.addEvent(mapValuesToPayload(values));
    if (result.success) {
      message.success('已添加事件');
      modalOpen.value = false;
    } else {
      message.error(result.errors?.join('；') ?? '添加失败');
    }
  }
};

const confirmDelete = (event: CashFlowEvent) => {
  Modal.confirm({
    title: `删除「${event.name}」？`,
    content: '删除后将无法恢复。',
    okText: '删除',
    okButtonProps: { danger: true },
    cancelText: '取消',
    onOk: () => {
      store.deleteEvent(event.id);
      message.success('已删除事件');
    },
  });
};

const handleToggle = ({ id, enabled }: { id: string; enabled: boolean }) => {
  store.toggleEvent(id, enabled);
};

const loadSamples = () => {
  let inputValue = '';

  Modal.confirm({
    title: '覆盖当前事件并载入示例？',
    content: h('div', [
      h('p', { style: 'color: #ef4444; margin-bottom: 12px;' }, '当前所有事件将被删除！'),
      h('p', { style: 'margin-bottom: 8px;' }, '请输入"载入示例"以确认：'),
      h('input', {
        type: 'text',
        class: 'ant-input',
        placeholder: '请输入：载入示例',
        style: 'width: 100%;',
        onInput: (e: Event) => {
          inputValue = (e.target as HTMLInputElement).value;
        },
      }),
    ]),
    okText: '载入',
    cancelText: '取消',
    onOk: () => {
      if (inputValue.trim() === '载入示例') {
        store.loadSampleData();
        message.success('已载入示例数据');
      } else {
        message.error('输入的文字不正确，操作已取消');
        return Promise.reject();
      }
    },
  });
};
</script>

<style scoped>
.event-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.panel-header > div:first-child {
  flex: 1;
  min-width: 0;
}

.panel-header h2 {
  margin: 0 0 4px;
  font-size: 1.125rem;
  font-weight: 600;
}

.panel-header p {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;
}

.panel-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
</style>
