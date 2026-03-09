import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent } from 'vue';
import EventList from '@/components/events/EventList.vue';
import { useFinanceStore } from '@/stores/finance';
import type { CashFlowEvent } from '@/types/event';

const ASwitchStub = defineComponent({
  name: 'ASwitch',
  props: ['checked', 'disabled', 'size'],
  emits: ['change'],
  template: `
    <button
      type="button"
      class="switch-stub"
      :data-checked="checked"
      :disabled="disabled"
      @click="$emit('change', !checked)"
    >
      switch
    </button>
  `,
});

const AButtonStub = defineComponent({
  name: 'AButton',
  props: ['disabled', 'size', 'type', 'danger'],
  emits: ['click'],
  template: '<button type="button" class="button-stub" :disabled="disabled" @click="$emit(\'click\')"><slot /><slot name="icon" /></button>',
});

const AppIconStub = defineComponent({
  name: 'AppIcon',
  template: '<span class="app-icon-stub" />',
});

const baseEvent = (overrides: Partial<CashFlowEvent> = {}): CashFlowEvent => ({
  id: overrides.id ?? 'evt-rent',
  accountId: overrides.accountId ?? 'acc-main',
  name: overrides.name ?? '房租',
  amount: overrides.amount ?? 3200,
  category: overrides.category ?? 'expense',
  type: overrides.type ?? 'monthly',
  startDate: overrides.startDate ?? '2026-01-01',
  endDate: overrides.endDate,
  onceDate: overrides.onceDate,
  monthlyDay: overrides.monthlyDay ?? 12,
  yearlyMonth: overrides.yearlyMonth,
  yearlyDay: overrides.yearlyDay,
  notes: overrides.notes,
  color: overrides.color,
  enabled: overrides.enabled ?? true,
  createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
});

const mountList = (props: Record<string, unknown> = {}) => mount(EventList, {
  props: {
    events: [
      baseEvent(),
      baseEvent({
        id: 'evt-salary',
        accountId: 'acc-side',
        name: '工资',
        amount: 15000,
        category: 'income',
        monthlyDay: 5,
      }),
    ],
    ...props,
  },
  global: {
    stubs: {
      ASwitch: ASwitchStub,
      AButton: AButtonStub,
      AppIcon: AppIconStub,
    },
  },
});

describe('EventList', () => {
  beforeEach(() => {
    setActivePinia(createPinia());

    const store = useFinanceStore();
    store.$patch({
      accounts: [
        {
          id: 'acc-main',
          name: '主账户',
          typeLabel: '现金账户',
          initialBalance: 5000,
          currency: 'CNY',
          warningThreshold: 1000,
          color: '#22c55e',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'acc-side',
          name: '副账户',
          typeLabel: '现金账户',
          initialBalance: 10000,
          currency: 'CNY',
          warningThreshold: 2000,
          color: '#0ea5e9',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      currentAccountId: 'acc-main',
    });
  });

  it('会把高亮、图表聚焦与只读语义真实透传给 EventCard', async () => {
    const wrapper = mountList({
      readonly: true,
      highlightedEventIds: ['evt-salary'],
      chartFocusable: true,
      chartFocusedEventId: 'evt-rent',
    });

    const cards = wrapper.findAll('.event-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].classes()).toContain('chart-focused');
    expect(cards[1].classes()).toContain('highlighted');

    expect(wrapper.findAll('.chart-focus-link')).toHaveLength(2);
    expect(wrapper.findAll('.action-btn')).toHaveLength(0);
    expect(wrapper.findAll('.switch-stub').every((node) => node.attributes('disabled') !== undefined)).toBe(true);

    await wrapper.findAll('.chart-focus-link')[1].trigger('click');
    expect(wrapper.emitted('focus-chart')?.[0]?.[0]).toMatchObject({ id: 'evt-salary' });
    expect(wrapper.emitted('toggle')).toBeUndefined();
  });

  it('在可编辑模式下会从真实子卡片继续冒泡 toggle/edit/delete 事件', async () => {
    const wrapper = mountList({
      readonly: false,
      chartFocusable: false,
    });

    const actionButtons = wrapper.findAll('.button-stub');
    expect(actionButtons).toHaveLength(4);
    expect(wrapper.findAll('.switch-stub').every((node) => node.attributes('disabled') === undefined)).toBe(true);

    await wrapper.findAll('.switch-stub')[0].trigger('click');
    expect(wrapper.emitted('toggle')?.[0]?.[0]).toEqual({ id: 'evt-rent', enabled: false });

    await actionButtons[0].trigger('click');
    await actionButtons[1].trigger('click');

    expect(wrapper.emitted('edit')?.[0]?.[0]).toMatchObject({ id: 'evt-rent' });
    expect(wrapper.emitted('delete')?.[0]?.[0]).toMatchObject({ id: 'evt-rent' });
    expect(wrapper.find('.chart-focus-link').exists()).toBe(false);
  });

  it('空列表时会展示空态提示，不渲染事件卡片', () => {
    const wrapper = mountList({ events: [] });

    expect(wrapper.text()).toContain('还没有现金流事件');
    expect(wrapper.text()).toContain('载入示例');
    expect(wrapper.find('.event-card').exists()).toBe(false);
  });
});
