import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, nextTick } from 'vue';
import EventPanel from '@/components/events/EventPanel.vue';
import { useFinanceStore } from '@/stores/finance';
import type { CashFlowEvent } from '@/types/event';

const { messageInfo, messageSuccess, messageError, modalConfirm } = vi.hoisted(() => ({
  messageInfo: vi.fn(),
  messageSuccess: vi.fn(),
  messageError: vi.fn(),
  modalConfirm: vi.fn(),
}));

vi.mock('ant-design-vue', async () => {
  const actual = await vi.importActual<typeof import('ant-design-vue')>('ant-design-vue');
  return {
    ...actual,
    message: {
      info: messageInfo,
      success: messageSuccess,
      error: messageError,
    },
    Modal: {
      confirm: modalConfirm,
    },
  };
});

const EventListStub = defineComponent({
  name: 'EventList',
  props: ['events', 'highlightedEventIds', 'chartFocusedEventId'],
  emits: ['focus-chart', 'edit', 'delete', 'toggle'],
  template: `
    <div class="event-list-stub">
      <button
        v-for="event in events"
        :key="event.id"
        type="button"
        class="focus-chart-trigger"
        @click="$emit('focus-chart', event)"
      >
        {{ event.name }}
      </button>
      <div class="highlighted">{{ highlightedEventIds?.join(',') }}</div>
      <div class="chart-focused">{{ chartFocusedEventId }}</div>
    </div>
  `,
});

const EventFormModalStub = defineComponent({
  name: 'EventFormModal',
  template: '<div class="event-form-modal-stub"></div>',
});

const AButtonStub = defineComponent({
  name: 'AButton',
  props: ['disabled', 'size', 'type'],
  emits: ['click'],
  template: '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
});

const baseEvent = (overrides: Partial<CashFlowEvent> = {}): CashFlowEvent => ({
  id: overrides.id ?? 'evt-rent',
  accountId: overrides.accountId ?? 'acc-main',
  name: overrides.name ?? '房租',
  amount: overrides.amount ?? 3000,
  category: overrides.category ?? 'expense',
  type: overrides.type ?? 'monthly',
  startDate: overrides.startDate ?? '2026-01-01',
  endDate: overrides.endDate,
  onceDate: overrides.onceDate,
  monthlyDay: overrides.monthlyDay ?? 10,
  yearlyMonth: overrides.yearlyMonth,
  yearlyDay: overrides.yearlyDay,
  notes: overrides.notes,
  color: overrides.color,
  enabled: overrides.enabled ?? true,
  createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
});

describe('EventPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    messageInfo.mockReset();
    messageSuccess.mockReset();
    messageError.mockReset();
    modalConfirm.mockReset();

    const store = useFinanceStore();
    store.setSimulatedToday('2026-04-01');
    store.$patch({
      accounts: [
        {
          id: 'acc-main',
          name: '主账户',
          typeLabel: '现金账户',
          initialBalance: 5000,
          currency: 'CNY',
          warningThreshold: 1000,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      currentAccountId: 'acc-main',
      events: [
        baseEvent(),
        baseEvent({
          id: 'evt-salary',
          name: '工资',
          amount: 8000,
          category: 'income',
          monthlyDay: 5,
        }),
      ],
      reconciliations: [
        {
          id: 'recon-1',
          accountId: 'acc-main',
          date: '2026-03-01',
          balance: 5000,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
      ledgerEntries: [],
      eventOverrides: [],
    });
  });

  it('会在图表定位横幅中展示全部发生日，并支持直接切换到指定日期', async () => {
    const wrapper = mount(EventPanel, {
      global: {
        stubs: {
          EventList: EventListStub,
          EventFormModal: EventFormModalStub,
          AButton: AButtonStub,
        },
      },
    });

    await wrapper.find('.focus-chart-trigger').trigger('click');
    await nextTick();

    expect(wrapper.text()).toContain('已定位到「房租」');
    expect(wrapper.text()).toContain('当前时间窗内发生日：2026-03-10、当前：2026-04-10、2026-05-10');

    const chips = wrapper.findAll('.focus-date-chip');
    expect(chips.length).toBeGreaterThanOrEqual(3);
    expect(chips.slice(0, 3).map((chip) => chip.text())).toEqual(['2026-03-10', '2026-04-10', '2026-05-10']);
    expect(chips[1].classes()).toContain('active');

    await chips[0].trigger('click');
    await nextTick();

    expect(wrapper.emitted('focus-chart-date')?.at(-1)).toEqual(['2026-03-10']);
    expect(wrapper.text()).toContain('当前时间窗内发生日：当前：2026-03-10、2026-04-10、2026-05-10');
    expect(wrapper.findAll('.focus-date-chip')[0].classes()).toContain('active');
  });

  it('仍保留上一个/下一个日期切换能力', async () => {
    const wrapper = mount(EventPanel, {
      global: {
        stubs: {
          EventList: EventListStub,
          EventFormModal: EventFormModalStub,
          AButton: AButtonStub,
        },
      },
    });

    await wrapper.find('.focus-chart-trigger').trigger('click');
    await nextTick();

    const buttons = wrapper.findAll('.focus-banner-actions button');
    const prevButton = buttons.find((button) => button.text() === '上一个日期');
    const nextButton = buttons.find((button) => button.text() === '下一个日期');

    expect(prevButton?.attributes('disabled')).toBeUndefined();
    expect(nextButton?.attributes('disabled')).toBeUndefined();

    await nextButton?.trigger('click');
    await nextTick();

    expect(wrapper.emitted('focus-chart-date')?.at(-1)).toEqual(['2026-05-10']);
    expect(wrapper.text()).toContain('图表已跳到 2026-05-10（第 3 / 12 次发生');
  });
});
