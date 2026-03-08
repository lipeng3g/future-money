import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import AccountMultiSelectModal from '@/components/account/AccountMultiSelectModal.vue';
import type { AccountConfig } from '@/types/account';

const { messageWarning } = vi.hoisted(() => ({
  messageWarning: vi.fn(),
}));

vi.mock('ant-design-vue', async () => {
  const actual = await vi.importActual<typeof import('ant-design-vue')>('ant-design-vue');
  return {
    ...actual,
    message: {
      warning: messageWarning,
    },
  };
});

const AModal = defineComponent({
  name: 'AModal',
  props: ['open', 'title', 'okButtonProps', 'okText', 'cancelText'],
  emits: ['ok', 'cancel'],
  template: `
    <div v-if="open" class="a-modal">
      <div class="modal-title">{{ title }}</div>
      <div class="modal-body"><slot /></div>
      <button class="modal-ok" :disabled="okButtonProps?.disabled" @click="$emit('ok')">{{ okText }}</button>
      <button class="modal-cancel" @click="$emit('cancel')">{{ cancelText }}</button>
    </div>
  `,
});

const ACheckbox = defineComponent({
  name: 'ACheckbox',
  props: ['checked', 'disabled'],
  emits: ['change', 'click'],
  methods: {
    emitChange(event: Event) {
      const target = event.target as HTMLInputElement | null;
      this.$emit('change', { target: { checked: !!target?.checked } });
    },
  },
  template: `
    <input
      class="a-checkbox"
      type="checkbox"
      :checked="checked"
      :disabled="disabled"
      @click="$emit('click', $event)"
      @change="emitChange"
    />
  `,
});

const baseAccounts: AccountConfig[] = [
  {
    id: 'cash',
    name: '现金',
    typeLabel: '日常',
    initialBalance: 1000,
    currency: '¥',
    warningThreshold: 300,
    color: '#3b82f6',
    iconKey: 'wallet',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'card',
    name: '信用卡',
    typeLabel: '负债',
    initialBalance: -500,
    currency: '¥',
    warningThreshold: 200,
    color: '#ef4444',
    iconKey: 'card',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'fund',
    name: '旅行基金',
    typeLabel: '储蓄',
    initialBalance: 3000,
    currency: '¥',
    warningThreshold: 400,
    color: '#10b981',
    iconKey: 'piggy-bank',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  },
];

const mountModal = (props?: Partial<InstanceType<typeof AccountMultiSelectModal>['$props']>) => mount(AccountMultiSelectModal, {
  props: {
    open: false,
    accounts: baseAccounts,
    initialSelected: ['cash'],
    latestReconciliationMap: {
      cash: { date: '2026-03-08', balance: 3200 },
      card: { date: '2026-03-08', balance: -1200 },
      fund: { date: '2026-03-05', balance: 8000 },
    },
    today: '2026-03-09',
    ...props,
  },
  global: {
    stubs: {
      AModal,
      ACheckbox,
    },
  },
});

describe('AccountMultiSelectModal', () => {
  beforeEach(() => {
    messageWarning.mockReset();
  });

  it('打开时会自动补齐与当前账户同一最新对账日的整组账户', async () => {
    const wrapper = mountModal();
    await wrapper.setProps({ open: true });
    await nextTick();

    const selectedCards = wrapper.findAll('.account-card.selected');
    expect(selectedCards).toHaveLength(2);
    expect(selectedCards[0].text()).toContain('现金');
    expect(selectedCards[1].text()).toContain('信用卡');
    expect(wrapper.text()).toContain('2026-03-08');
    expect(wrapper.text()).not.toContain('至少选择两个账户');

    await wrapper.find('.modal-ok').trigger('click');
    expect(wrapper.emitted('confirm')).toEqual([[['cash', 'card']]]);
  });

  it('当入口账户没有可用基准时，会回退到人数最多且日期最新的可汇总组', async () => {
    const wrapper = mountModal({
      initialSelected: ['missing'],
      latestReconciliationMap: {
        cash: { date: '2026-03-04', balance: 3200 },
        card: { date: '2026-03-06', balance: -1200 },
        fund: { date: '2026-03-06', balance: 8000 },
      },
    });
    await wrapper.setProps({ open: true });
    await nextTick();

    const selectedCards = wrapper.findAll('.account-card.selected');
    expect(selectedCards).toHaveLength(2);
    expect(selectedCards[0].text()).toContain('信用卡');
    expect(selectedCards[1].text()).toContain('旅行基金');
    expect(wrapper.text()).toContain('2026-03-06');

    await wrapper.find('.modal-ok').trigger('click');
    expect(wrapper.emitted('confirm')).toEqual([[['card', 'fund']]]);
  });

  it('只剩一个账户时会阻断确认并给出提示', async () => {
    const wrapper = mountModal();
    await wrapper.setProps({ open: true });
    await nextTick();

    await wrapper.findAll('.account-card')[1].trigger('click');
    await nextTick();

    expect(wrapper.text()).toContain('至少选择两个账户');
    expect(wrapper.find('.modal-ok').attributes('disabled')).toBeDefined();

    await wrapper.find('.modal-ok').trigger('click');
    expect(wrapper.emitted('confirm')).toBeFalsy();
  });
});
