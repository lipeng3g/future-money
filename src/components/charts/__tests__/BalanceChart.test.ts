import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import BalanceChart from '@/components/charts/BalanceChart.vue';
import type { DailySnapshot } from '@/types/timeline';

vi.mock('vue-echarts', () => ({
  default: defineComponent({
    name: 'VChart',
    props: ['option', 'autoresize'],
    emits: ['click'],
    template: '<div class="v-chart" @click="$emit(\'click\', { dataIndex: 0 })"></div>',
  }),
}));

const balanceRuntimeHook = vi.fn();
vi.mock('@/utils/echarts-balance', async () => {
  await balanceRuntimeHook();
  return {};
});

beforeEach(() => {
  balanceRuntimeHook.mockReset();
  balanceRuntimeHook.mockResolvedValue(undefined);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
});

const createDay = (overrides: Partial<DailySnapshot> & Pick<DailySnapshot, 'date' | 'balance' | 'change'>): DailySnapshot => ({
  date: overrides.date,
  balance: overrides.balance,
  change: overrides.change,
  events: overrides.events ?? [],
  isWeekend: overrides.isWeekend ?? false,
  isToday: overrides.isToday ?? false,
  zone: overrides.zone ?? 'projected',
  reconciliationId: overrides.reconciliationId,
  snapshotId: overrides.snapshotId,
});

const richTimeline: DailySnapshot[] = [
  createDay({
    date: '2026-03-01',
    balance: 3200,
    change: 0,
    zone: 'frozen',
    events: [
      {
        id: 'occ-1',
        eventId: 'salary-1',
        name: '工资',
        category: 'income',
        amount: 3200,
        date: '2026-03-01',
      },
    ],
  }),
  createDay({
    date: '2026-03-09',
    balance: 900,
    change: -2300,
    isToday: true,
    events: [
      {
        id: 'occ-2',
        eventId: 'rent-1',
        name: '房租',
        category: 'expense',
        amount: 2300,
        date: '2026-03-09',
        accountId: 'cash',
      },
      {
        id: 'occ-2b',
        eventId: 'food-1',
        name: '买菜',
        category: 'expense',
        amount: 120,
        date: '2026-03-09',
        accountId: 'card',
      },
    ],
  }),
  createDay({
    date: '2026-03-20',
    balance: 5400,
    change: 4500,
    events: [
      {
        id: 'occ-3',
        eventId: 'bonus-1',
        name: '奖金',
        category: 'income',
        amount: 4500,
        date: '2026-03-20',
      },
    ],
  }),
];

const mountChart = (props: Record<string, unknown> = {}) => mount(BalanceChart, {
  props: {
    timeline: richTimeline,
    warningThreshold: 1000,
    reconciliationDate: '2026-03-01',
    reconciliationBalance: 3200,
    ...props,
  },
});

describe('BalanceChart', () => {
  it('空时间线时展示空态而不是图表容器', () => {
    const wrapper = mount(BalanceChart, {
      props: {
        timeline: [],
        warningThreshold: 1000,
      },
    });

    expect(wrapper.text()).toContain('还没有可展示的余额走势');
    expect(wrapper.find('.chart-empty-state').exists()).toBe(true);
    expect(wrapper.find('.v-chart').exists()).toBe(false);
  });

  it('runtime 就绪前先展示加载态，完成后再渲染图表', async () => {
    let resolveLoader: (() => void) | null = null;
    balanceRuntimeHook.mockImplementationOnce(() => new Promise<void>((resolve) => {
      resolveLoader = resolve;
    }));

    const wrapper = mountChart();
    expect(wrapper.text()).toContain('正在加载图表引擎');
    expect(wrapper.find('.v-chart').exists()).toBe(false);

    resolveLoader?.();
    await flushPromises();
    await nextTick();

    expect(wrapper.find('.chart-loading-state').exists()).toBe(false);
    expect(wrapper.find('.v-chart').exists()).toBe(true);
  });

  it('会渲染快速定位条，并在切换后更新焦点解释卡与事件摘要 chips', async () => {
    const wrapper = mountChart();
    await flushPromises();
    await nextTick();

    const chips = wrapper.findAll('.focus-chip');
    expect(chips.map((node) => node.text())).toEqual(['最新区间', '今天', '首次预警', '最低点', '最高点', '最近对账']);
    expect(wrapper.find('.toolbar-copy').text()).toContain('首次预警 · 2026-03-09');
    expect(wrapper.find('.focus-insight').text()).toContain('首次跌破预警线');
    const groupHeaders = wrapper.findAll('.focus-event-group-header');
    expect(groupHeaders).toHaveLength(2);
    expect(groupHeaders[0].text()).toContain('账户 cash');
    expect(groupHeaders[0].text()).toContain('1 笔 · -¥2,300');
    expect(groupHeaders[1].text()).toContain('账户 card');
    expect(groupHeaders[1].text()).toContain('1 笔 · -¥120');
    expect(wrapper.find('.focus-event-groups').text()).toContain('房租');
    expect(wrapper.find('.focus-event-groups').text()).toContain('买菜');

    await chips.find((node) => node.text() === '最高点')?.trigger('click');
    await nextTick();

    expect(wrapper.find('.focus-chip.active').text()).toBe('最高点');
    expect(wrapper.find('.toolbar-copy').text()).toContain('最高点 · 2026-03-20');
    expect(wrapper.find('.focus-insight').classes()).toContain('success');
    expect(wrapper.find('.focus-insight').text()).toContain('达到当前视图最高余额');
    expect(wrapper.find('.focus-insight').text()).toContain('当日事件：奖金 +¥4,500');
    expect(wrapper.find('.focus-event-group-header').text()).toContain('当日事件');
    expect(wrapper.find('.focus-event-group-header').text()).toContain('1 笔');
    expect(wrapper.find('.focus-event-chip').text()).toContain('奖金');
    expect(wrapper.find('.focus-event-chip').text()).toContain('+¥4,500');
  });

  it('会响应外部 focusKey 和 focusDate 联动，并在外部定位清空后回到正常快速定位', async () => {
    const wrapper = mountChart({ focusKey: 'reconciliation' });
    await flushPromises();
    await nextTick();

    expect(wrapper.find('.focus-chip.active').text()).toBe('最近对账');
    expect(wrapper.find('.focus-insight').text()).toContain('最近一次对账锚点');
    expect(wrapper.find('.focus-insight').text()).toContain('¥3,200');

    await wrapper.setProps({ focusDate: '2026-03-20' });
    await nextTick();

    expect(wrapper.find('.toolbar-copy').text()).toContain('定位日期 · 2026-03-20');
    expect(wrapper.find('.focus-insight').classes()).toContain('info');
    expect(wrapper.find('.focus-insight').text()).toContain('当前选中事件在图表中的发生日期');
    expect(wrapper.find('.focus-insight').text()).toContain('余额变化 ¥4,500');
    expect(wrapper.find('.focus-insight').text()).toContain('当日事件：奖金 +¥4,500');

    await wrapper.setProps({ focusDate: undefined });
    await nextTick();

    expect(wrapper.find('.focus-chip.active').text()).toBe('最近对账');
    expect(wrapper.find('.toolbar-copy').text()).toContain('最近对账 · 2026-03-01');
    expect(wrapper.find('.focus-insight').text()).toContain('最近一次对账锚点');
    expect(wrapper.find('.focus-insight').text()).not.toContain('当前选中事件在图表中的发生日期');
  });

  it('点击含事件的数据点或焦点摘要里的事件 chips 时会发出 select-date', async () => {
    const wrapper = mountChart();
    await flushPromises();
    await nextTick();

    await wrapper.findComponent({ name: 'VChart' }).vm.$emit('click', { dataIndex: 1 });
    expect(wrapper.emitted('select-date')).toEqual([['2026-03-09']]);

    await wrapper.find('.focus-event-chip').trigger('click');

    await wrapper.findComponent({ name: 'VChart' }).vm.$emit('click', { dataIndex: 99 });
    await wrapper.findComponent({ name: 'VChart' }).vm.$emit('click', { dataIndex: 0 });

    expect(wrapper.emitted('select-date')).toEqual([
      ['2026-03-09'],
      ['2026-03-09'],
      ['2026-03-01'],
    ]);
  });

  it('点击没有事件的数据点不会发出 select-date', async () => {
    const quietTimeline = [
      createDay({ date: '2026-03-01', balance: 1000, change: 0 }),
      createDay({ date: '2026-03-02', balance: 1100, change: 100 }),
    ];

    const wrapper = mount(BalanceChart, {
      props: {
        timeline: quietTimeline,
        warningThreshold: 500,
      },
    });
    await flushPromises();
    await nextTick();

    await wrapper.findComponent({ name: 'VChart' }).vm.$emit('click', { dataIndex: 0 });
    expect(wrapper.emitted('select-date')).toBeUndefined();
  });
});
