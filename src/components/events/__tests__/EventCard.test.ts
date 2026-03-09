import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent } from 'vue';
import EventCard from '@/components/events/EventCard.vue';
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

const mountCard = (props: Record<string, unknown> = {}) => mount(EventCard, {
  props: {
    event: baseEvent(),
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

describe('EventCard', () => {
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
      ],
      currentAccountId: 'acc-main',
    });
  });

  it('展示账户、频率与金额摘要，并支持图表定位入口', async () => {
    const wrapper = mountCard({ chartFocusable: true });

    expect(wrapper.text()).toContain('房租');
    expect(wrapper.text()).toContain('主账户');
    expect(wrapper.text()).toContain('每月12日');
    expect(wrapper.text()).toContain('-¥3,200');

    const accountDot = wrapper.find('.account-dot');
    expect(accountDot.attributes('style')).toContain('background: rgb(34, 197, 94)');

    await wrapper.find('.chart-focus-link').trigger('click');
    expect(wrapper.emitted('focus-chart')?.[0]?.[0]).toMatchObject({ id: 'evt-rent' });
  });

  it('在只读模式下会禁用开关并隐藏编辑/删除按钮', () => {
    const wrapper = mountCard({ readonly: true });

    const switchButton = wrapper.find('.switch-stub');
    expect(switchButton.attributes('disabled')).toBeDefined();
    expect(wrapper.findAll('.action-btn')).toHaveLength(0);
  });

  it('会透传启停、编辑、删除事件，并展示暂停状态', async () => {
    const wrapper = mountCard({
      event: baseEvent({ enabled: false }),
    });

    expect(wrapper.text()).toContain('已暂停');

    await wrapper.find('.switch-stub').trigger('click');
    expect(wrapper.emitted('toggle')?.[0]?.[0]).toEqual({ id: 'evt-rent', enabled: true });

    const buttons = wrapper.findAll('.button-stub');
    await buttons[0].trigger('click');
    await buttons[1].trigger('click');

    expect(wrapper.emitted('edit')?.[0]?.[0]).toMatchObject({ id: 'evt-rent' });
    expect(wrapper.emitted('delete')?.[0]?.[0]).toMatchObject({ id: 'evt-rent' });
  });

  it('会跟随 store 只读状态自动切到禁用展示语义', () => {
    const store = useFinanceStore();
    store.$patch({
      snapshots: [
        {
          id: 'snap-old',
          accountId: 'acc-main',
          date: '2026-02-01',
          balance: 4800,
          source: 'manual',
          note: '旧快照',
          createdAt: '2026-02-01T00:00:00.000Z',
        },
        {
          id: 'snap-new',
          accountId: 'acc-main',
          date: '2026-03-01',
          balance: 5000,
          source: 'manual',
          note: '最新快照',
          createdAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    });
    store.setViewSnapshot('snap-old');

    const wrapper = mountCard();
    expect(wrapper.find('.switch-stub').attributes('disabled')).toBeDefined();
    expect(wrapper.findAll('.action-btn')).toHaveLength(0);
  });
});
