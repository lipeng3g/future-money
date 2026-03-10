import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, nextTick } from 'vue';
import UpcomingEvents from '@/components/charts/UpcomingEvents.vue';
import { useFinanceStore } from '@/stores/finance';
import type { DailySnapshot } from '@/types/timeline';
import { message } from 'ant-design-vue';

vi.mock('ant-design-vue', async () => {
  const actual = await vi.importActual<typeof import('ant-design-vue')>('ant-design-vue');
  return {
    ...actual,
    message: { success: vi.fn() },
  };
});

const DropdownStub = defineComponent({
  name: 'ADropdown',
  template: '<div class="dropdown-stub"><slot /><slot name="overlay" /></div>',
});

const MenuStub = defineComponent({
  name: 'AMenu',
  emits: ['click'],
  template: '<div class="menu-stub"><slot /></div>',
});

const MenuItemStub = defineComponent({
  name: 'AMenuItem',
  template: '<button class="menu-item-stub"><slot /></button>',
});

const ButtonStub = defineComponent({
  name: 'AButton',
  template: '<button class="button-stub"><slot /></button>',
});

const ModalStub = defineComponent({
  name: 'AModal',
  props: ['open'],
  emits: ['ok', 'cancel'],
  template: '<div v-if="open" class="modal-stub"><slot /></div>',
});

const FormStub = defineComponent({
  name: 'AForm',
  template: '<form class="form-stub"><slot /></form>',
});

const FormItemStub = defineComponent({
  name: 'AFormItem',
  template: '<div class="form-item-stub"><slot /></div>',
});

const InputNumberStub = defineComponent({
  name: 'AInputNumber',
  props: ['value'],
  emits: ['update:value'],
  template: '<input class="input-number-stub" />',
});

const mountUpcomingEvents = (timeline: DailySnapshot[], activeDate: string | null = null) => mount(UpcomingEvents, {
  props: { timeline, activeDate },
  global: {
    stubs: {
      'a-dropdown': DropdownStub,
      'a-menu': MenuStub,
      'a-menu-item': MenuItemStub,
      'a-button': ButtonStub,
      'a-modal': ModalStub,
      'a-form': FormStub,
      'a-form-item': FormItemStub,
      'a-input-number': InputNumberStub,
    },
  },
});

describe('UpcomingEvents', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(message.success).mockReset();
  });

  it('按日期升序展示，且同日优先支出和大额事件', () => {
    const store = useFinanceStore();
    store.setSimulatedToday('2025-01-10');

    const timeline: DailySnapshot[] = [
      {
        date: '2025-01-11',
        balance: 0,
        change: 0,
        isWeekend: false,
        isToday: false,
        zone: 'projected',
        events: [
          { id: 'income-small', eventId: 'e1', name: '工资补贴', category: 'income', amount: 500, date: '2025-01-11', period: '2025-01' },
          { id: 'expense-big', eventId: 'e2', name: '房租', category: 'expense', amount: 3000, date: '2025-01-11', period: '2025-01' },
          { id: 'expense-small', eventId: 'e3', name: '午餐', category: 'expense', amount: 30, date: '2025-01-11', period: '2025-01' },
        ],
      },
      {
        date: '2025-01-12',
        balance: 0,
        change: 0,
        isWeekend: false,
        isToday: false,
        zone: 'projected',
        events: [
          { id: 'later-income', eventId: 'e4', name: '奖金', category: 'income', amount: 888, date: '2025-01-12', period: '2025-01' },
        ],
      },
    ];

    const wrapper = mountUpcomingEvents(timeline);
    const names = wrapper.findAll('.event-name').map((node) => node.text());
    expect(names).toEqual(['房租', '午餐', '工资补贴', '奖金']);
  });

  it('默认只渲染有限条目，避免长时间线侧栏过载', () => {
    const store = useFinanceStore();
    store.setSimulatedToday('2025-01-01');

    const timeline: DailySnapshot[] = Array.from({ length: 30 }, (_, index) => ({
      date: `2025-01-${String(index + 1).padStart(2, '0')}`,
      balance: 0,
      change: 0,
      isWeekend: false,
      isToday: false,
      zone: 'projected' as const,
      events: [
        { id: `event-${index + 1}`, eventId: `event-${index + 1}`, name: `事件 ${index + 1}`, category: 'expense' as const, amount: index + 1, date: `2025-01-${String(index + 1).padStart(2, '0')}`, period: `2025-01-${String(index + 1).padStart(2, '0')}` },
      ],
    }));

    const wrapper = mountUpcomingEvents(timeline);
    expect(wrapper.findAll('li')).toHaveLength(18);
    expect(wrapper.text()).toContain('事件 18');
    expect(wrapper.text()).not.toContain('事件 19');
  });

  it('操作覆盖时调用 store action 并给出成功提示', async () => {
    const store = useFinanceStore();
    store.setSimulatedToday('2025-01-10');
    const addEventOverride = vi.spyOn(store, 'addEventOverride');

    const timeline: DailySnapshot[] = [{
      date: '2025-01-11',
      balance: 0,
      change: 0,
      isWeekend: false,
      isToday: false,
      zone: 'projected',
      events: [
        { id: 'expense-big', eventId: 'rule-rent', name: '房租', category: 'expense', amount: 3000, date: '2025-01-11', period: '2025-01' },
      ],
    }];

    const wrapper = mountUpcomingEvents(timeline);
    await (wrapper.vm as any).handleAction('skipped', (wrapper.vm as any).items[0]);
    await nextTick();

    expect(addEventOverride).toHaveBeenCalledWith('rule-rent', '2025-01', 'skipped');
    expect(message.success).toHaveBeenCalledWith('已跳过本期');
  });

  it('只读视图下不展示事件操作入口', () => {
    const store = useFinanceStore();
    store.setSimulatedToday('2025-01-10');
    store.viewMode = 'multi';

    const timeline: DailySnapshot[] = [{
      date: '2025-01-11',
      balance: 0,
      change: 0,
      isWeekend: false,
      isToday: false,
      zone: 'projected',
      events: [
        { id: 'expense-big', eventId: 'rule-rent', name: '房租', category: 'expense', amount: 3000, date: '2025-01-11', period: '2025-01' },
      ],
    }];

    const wrapper = mountUpcomingEvents(timeline);
    expect(wrapper.find('.event-actions').exists()).toBe(false);
  });

  it('多账户视图下展示来源账户标签，避免即将发生列表看不出是哪张卡', () => {
    const store = useFinanceStore();
    store.setSimulatedToday('2025-01-10');
    const accountA = store.currentAccount;
    const accountB = store.addAccount({ name: '储蓄卡', initialBalance: 0, warningThreshold: 0 });
    store.viewMode = 'multi';
    store.multiAccountSelection = [accountA.id, accountB.id];

    const timeline: DailySnapshot[] = [{
      date: '2025-01-11',
      balance: 0,
      change: 0,
      isWeekend: false,
      isToday: false,
      zone: 'projected',
      events: [
        { id: 'salary', eventId: 'salary', name: '工资', category: 'income', amount: 5000, date: '2025-01-11', period: '2025-01', accountId: accountA.id },
        { id: 'rent', eventId: 'rent', name: '房租', category: 'expense', amount: 2800, date: '2025-01-11', period: '2025-01', accountId: accountB.id },
      ],
    }];

    const wrapper = mountUpcomingEvents(timeline);
    const tags = wrapper.findAll('.account-tag').map((node) => node.text());
    expect(tags).toContain(accountA.name);
    expect(tags).toContain('储蓄卡');
  });

  it('单账户视图下不额外展示账户标签，避免重复噪音', () => {
    const store = useFinanceStore();
    store.setSimulatedToday('2025-01-10');
    store.viewMode = 'single';

    const timeline: DailySnapshot[] = [{
      date: '2025-01-11',
      balance: 0,
      change: 0,
      isWeekend: false,
      isToday: false,
      zone: 'projected',
      events: [
        { id: 'salary', eventId: 'salary', name: '工资', category: 'income', amount: 5000, date: '2025-01-11', period: '2025-01', accountId: store.currentAccount.id },
      ],
    }];

    const wrapper = mountUpcomingEvents(timeline);
    expect(wrapper.find('.account-tag').exists()).toBe(false);
  });

  it('点击未来事件时会发出 focus-date，方便联动余额图定位', async () => {
    const store = useFinanceStore();
    store.setSimulatedToday('2025-01-10');

    const timeline: DailySnapshot[] = [{
      date: '2025-01-11',
      balance: 0,
      change: 0,
      isWeekend: false,
      isToday: false,
      zone: 'projected',
      events: [
        { id: 'rent', eventId: 'rent', name: '房租', category: 'expense', amount: 2800, date: '2025-01-11', period: '2025-01' },
      ],
    }];

    const wrapper = mountUpcomingEvents(timeline);
    await wrapper.find('li').trigger('click');

    expect(wrapper.emitted('focus-date')?.at(-1)).toEqual(['2025-01-11']);
  });

  it('键盘回车也能触发 future item 的 focus-date，保持可访问性', async () => {
    const store = useFinanceStore();
    store.setSimulatedToday('2025-01-10');

    const timeline: DailySnapshot[] = [{
      date: '2025-01-11',
      balance: 0,
      change: 0,
      isWeekend: false,
      isToday: false,
      zone: 'projected',
      events: [
        { id: 'salary', eventId: 'salary', name: '工资', category: 'income', amount: 5000, date: '2025-01-11', period: '2025-01' },
      ],
    }];

    const wrapper = mountUpcomingEvents(timeline);
    await wrapper.find('li').trigger('keydown.enter');

    expect(wrapper.emitted('focus-date')?.at(-1)).toEqual(['2025-01-11']);
  });

  it('当前已定位日期会在侧栏高亮，重复点击同项时可取消定位', async () => {
    const store = useFinanceStore();
    store.setSimulatedToday('2025-01-10');

    const timeline: DailySnapshot[] = [{
      date: '2025-01-11',
      balance: 0,
      change: 0,
      isWeekend: false,
      isToday: false,
      zone: 'projected',
      events: [
        { id: 'rent', eventId: 'rent', name: '房租', category: 'expense', amount: 2800, date: '2025-01-11', period: '2025-01' },
      ],
    }];

    const wrapper = mountUpcomingEvents(timeline, '2025-01-11');
    const item = wrapper.find('li');

    expect(item.classes()).toContain('active');
    expect(item.attributes('aria-pressed')).toBe('true');

    await item.trigger('click');
    expect(wrapper.emitted('focus-date')?.at(-1)).toEqual(['']);
  });
});
