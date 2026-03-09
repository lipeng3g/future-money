<template>
  <section class="event-panel">
    <header class="panel-header">
      <div>
        <h2>现金流事件</h2>
        <p>维护工资、信用卡、房贷、年终奖等所有固定/一次性收支。</p>
      </div>
      <div class="panel-actions">
        <a-button :disabled="isReadOnly" @click="loadSamples">载入示例</a-button>
        <a-button type="primary" :disabled="isReadOnly" @click="openCreator">添加事件</a-button>
      </div>
    </header>

    <div v-if="activeFocus" class="focus-banner" :class="{ 'focus-banner--chart': activeChartFocus }">
      <div class="focus-banner-copy">
        <strong>{{ activeFocus.title }}</strong>
        <p>{{ activeFocus.summary }}</p>
        <p v-if="activeChartFocus?.detail" class="focus-detail">{{ activeChartFocus.detail }}</p>
        <p v-else-if="activeListFocus?.detail" class="focus-detail">{{ activeListFocus.detail }}</p>
      </div>
      <div class="focus-banner-actions">
        <template v-if="activeChartFocus">
          <div v-if="activeChartFocus.matchedDates.length > 1" class="focus-date-list" aria-label="当前时间窗内发生日列表">
            <button
              v-for="(matchedDate, index) in activeChartFocus.matchedDates"
              :key="matchedDate"
              type="button"
              class="focus-date-chip"
              :class="{ active: index === activeChartFocus.occurrenceIndex }"
              @click="focusChartOccurrence(index)"
            >
              {{ matchedDate }}
            </button>
          </div>
          <a-button size="small" @click="stepChartFocus(-1)" :disabled="!activeChartFocus.canFocusPrev">上一个日期</a-button>
          <a-button size="small" @click="stepChartFocus(1)" :disabled="!activeChartFocus.canFocusNext">下一个日期</a-button>
        </template>
        <a-button size="small" type="text" @click="clearFocus">清除定位</a-button>
      </div>
    </div>

    <div v-if="readOnlyReason" class="readonly-banner" role="status" aria-live="polite">
      <strong>当前事件列表为只读</strong>
      <p>{{ readOnlyReason }}</p>
    </div>

    <EventList
      :events="displayEvents"
      :readonly="isReadOnly"
      :highlighted-event-ids="highlightedEventIds"
      :chart-focusable="true"
      :chart-focused-event-id="activeChartFocus?.eventId ?? null"
      @edit="openEditor"
      @delete="confirmDelete"
      @toggle="handleToggle"
      @focus-chart="handleFocusChart"
    />

    <EventFormModal
      :open="modalOpen"
      :event="editingEvent"
      :submit-error="submitError"
      @submit="handleSubmit"
      @cancel="closeModal"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, h } from 'vue';
import { Modal, message } from 'ant-design-vue';
import EventList from '@/components/events/EventList.vue';
import EventFormModal from '@/components/events/EventFormModal.vue';
import type { CashFlowEvent, EventFormValues, NewCashFlowEvent } from '@/types/event';
import type { EventListFocusState, EventChartFocusState } from '@/utils/event-focus';
import { buildEventChartFocusState, stepEventChartFocusState } from '@/utils/event-focus';
import { useFinanceStore } from '@/stores/finance';

const props = defineProps<{
  focusState?: EventListFocusState | null;
}>();

const emit = defineEmits<{
  (e: 'clear-focus'): void;
  (e: 'focus-chart-date', date: string): void;
}>();

const store = useFinanceStore();
const modalOpen = ref(false);
const editingEvent = ref<CashFlowEvent | null>(null);
const submitError = ref<string | null>(null);
const chartFocusState = ref<EventChartFocusState | null>(null);
const activeChartFocus = computed(() => chartFocusState.value);
const activeListFocus = computed(() => props.focusState ?? null);
const activeFocus = computed(() => activeChartFocus.value ?? activeListFocus.value ?? null);
const isReadOnly = computed(() => store.isReadOnly);
const readOnlyReason = computed(() => {
  if (store.isMultiAccountView) {
    return '多账户汇总视图只支持查看与定位，切回单账户后才能新增、编辑、删除或启停事件，避免误把某个账户规则当成整组账户统一修改。';
  }
  if (store.isHistoricalView) {
    return '历史快照视图只用于回看已冻结结果；请切回最新视图后再修改事件规则，避免误以为改动会直接覆盖历史对账结果。';
  }
  return null;
});
const events = computed(() => store.visibleEvents);
const highlightedEventIds = computed(() => {
  if (activeChartFocus.value) return [activeChartFocus.value.eventId];
  return activeListFocus.value?.eventIds ?? [];
});
const displayEvents = computed(() => {
  if (activeChartFocus.value) {
    const focusedIds = new Set([activeChartFocus.value.eventId]);
    const focused = events.value.filter((event) => focusedIds.has(event.id));
    const rest = events.value.filter((event) => !focusedIds.has(event.id));
    return [...focused, ...rest];
  }

  if (!activeListFocus.value?.eventIds.length) {
    return events.value;
  }

  const focusedIds = new Set(activeListFocus.value.eventIds);
  const focused = events.value.filter((event) => focusedIds.has(event.id));
  const rest = events.value.filter((event) => !focusedIds.has(event.id));
  return [...focused, ...rest];
});

watch(
  () => props.focusState,
  () => {
    chartFocusState.value = null;
  },
);

watch(
  highlightedEventIds,
  async (ids) => {
    if (!ids.length) return;
    await nextTick();
    document.getElementById(`event-card-${ids[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },
  { immediate: true },
);

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

const guardReadOnlyAction = () => {
  if (!isReadOnly.value) return false;
  message.info(readOnlyReason.value ?? '当前视图为只读，暂时不能修改事件');
  return true;
};

const openCreator = () => {
  if (guardReadOnlyAction()) return;
  editingEvent.value = null;
  submitError.value = null;
  modalOpen.value = true;
};

const openEditor = (event: CashFlowEvent) => {
  if (guardReadOnlyAction()) return;
  editingEvent.value = event;
  submitError.value = null;
  modalOpen.value = true;
};

const closeModal = () => {
  modalOpen.value = false;
  submitError.value = null;
};

const clearFocus = () => {
  chartFocusState.value = null;
  emit('clear-focus');
};

const handleFocusChart = (event: CashFlowEvent) => {
  const focus = buildEventChartFocusState(store.timeline, event);
  if (!focus) {
    message.info('当前时间窗内还没有这个事件对应的图表日期');
    return;
  }

  chartFocusState.value = focus;
  emit('focus-chart-date', focus.date);
};

const focusChartOccurrence = (occurrenceIndex: number) => {
  if (!chartFocusState.value) return;

  const targetDate = chartFocusState.value.matchedDates[occurrenceIndex];
  if (!targetDate || targetDate === chartFocusState.value.date) return;

  const event = events.value.find((item) => item.id === chartFocusState.value?.eventId);
  if (!event) {
    clearFocus();
    return;
  }

  const nextFocus = buildEventChartFocusState(store.timeline, event, targetDate);
  if (!nextFocus) return;

  chartFocusState.value = nextFocus;
  emit('focus-chart-date', nextFocus.date);
};

const stepChartFocus = (direction: -1 | 1) => {
  if (!chartFocusState.value) return;

  const event = events.value.find((item) => item.id === chartFocusState.value?.eventId);
  if (!event) {
    clearFocus();
    return;
  }

  const nextFocus = stepEventChartFocusState(store.timeline, event, chartFocusState.value, direction);
  if (!nextFocus) return;

  chartFocusState.value = nextFocus;
  emit('focus-chart-date', nextFocus.date);
};

const handleSubmit = (values: EventFormValues) => {
  if (guardReadOnlyAction()) return;

  submitError.value = null;

  if (editingEvent.value) {
    const result = store.updateEvent(editingEvent.value.id, mapValuesToPayload(values));
    if (result.success) {
      message.success('已更新事件');
      closeModal();
    } else {
      submitError.value = result.errors?.join('；') ?? result.message ?? '更新失败';
      message.error(submitError.value);
    }
  } else {
    const result = store.addEvent(mapValuesToPayload(values));
    if (result.success) {
      message.success('已添加事件');
      closeModal();
    } else {
      submitError.value = result.errors?.join('；') ?? result.message ?? '添加失败';
      message.error(submitError.value);
    }
  }
};

const confirmDelete = (event: CashFlowEvent) => {
  if (guardReadOnlyAction()) return;

  Modal.confirm({
    title: `删除「${event.name}」？`,
    content: '删除后将无法恢复。',
    okText: '删除',
    okButtonProps: { danger: true },
    cancelText: '取消',
    onOk: () => {
      store.deleteEvent(event.id);
      message.success('已删除事件');
      if ((activeChartFocus.value && activeChartFocus.value.eventId === event.id) || activeListFocus.value?.eventIds.includes(event.id)) {
        clearFocus();
      }
    },
  });
};

const handleToggle = ({ id, enabled }: { id: string; enabled: boolean }) => {
  if (guardReadOnlyAction()) return;
  store.toggleEvent(id, enabled);
};

const loadSamples = () => {
  if (guardReadOnlyAction()) return;
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
        clearFocus();
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
  align-items: flex-end;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--fm-border-subtle);
}

.panel-header h2 {
  margin: 0 0 4px;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--fm-text-primary);
  letter-spacing: -0.02em;
}

.panel-header p {
  margin: 0;
  color: var(--fm-text-secondary);
  font-size: 0.875rem;
}

.panel-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.focus-banner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(67, 56, 202, 0.16);
  background: rgba(67, 56, 202, 0.06);
}

.focus-banner--chart {
  border-color: rgba(14, 165, 233, 0.18);
  background: rgba(14, 165, 233, 0.07);
}

.focus-banner-copy {
  min-width: 0;
  flex: 1;
}

.focus-banner strong {
  color: var(--fm-text-primary);
  font-size: 0.9rem;
}

.focus-banner p {
  margin: 4px 0 0;
  color: var(--fm-text-secondary);
  font-size: 0.82rem;
  line-height: 1.6;
}

.focus-detail {
  margin-top: 6px;
  color: var(--fm-text-primary);
}

.focus-banner-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.focus-date-list {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  max-width: min(100%, 360px);
  justify-content: flex-end;
}

.focus-date-chip {
  border: 1px solid rgba(14, 165, 233, 0.18);
  background: rgba(255, 255, 255, 0.72);
  color: #0369a1;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.focus-date-chip:hover {
  border-color: rgba(14, 165, 233, 0.34);
  color: #0c4a6e;
}

.focus-date-chip.active {
  background: rgba(14, 165, 233, 0.14);
  color: #0c4a6e;
  box-shadow: inset 0 0 0 1px rgba(14, 165, 233, 0.1);
}

.readonly-banner {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(245, 158, 11, 0.22);
  background: rgba(245, 158, 11, 0.08);
}

.readonly-banner strong {
  color: #92400e;
  font-size: 0.9rem;
}

.readonly-banner p {
  margin: 0;
  color: #9a3412;
  font-size: 0.82rem;
  line-height: 1.6;
}
</style>
