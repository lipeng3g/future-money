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

vi.mock('@/utils/echarts-balance', () => ({}));

beforeEach(() => {
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

  it('会渲染快速定位条，并在切换后更新焦点解释卡', async () => {
    const wrapper = mountChart();

    const chips = wrapper.findAll('.focus-chip');
    expect(chips.map((node) => node.text())).toEqual(['最新区间', '今天', '首次预警', '最低点', '最高点', '最近对账']);
    expect(wrapper.find('.toolbar-copy').text()).toContain('首次预警 · 2026-03-09');
    expect(wrapper.find('.focus-insight').text()).toContain('首次跌破预警线');

    await chips.find((node) => node.text() === '最高点')?.trigger('click');
    await nextTick();

    expect(wrapper.find('.focus-chip.active').text()).toBe('最高点');
    expect(wrapper.find('.toolbar-copy').text()).toContain('最高点 · 2026-03-20');
    expect(wrapper.find('.focus-insight').classes()).toContain('success');
    expect(wrapper.find('.focus-insight').text()).toContain('达到当前视图最高余额');
    expect(wrapper.find('.focus-insight').text()).toContain('当日事件：奖金 +¥4,500');
  });

  it('会响应外部 focusKey 和 focusDate 联动，优先显示指定日期解释', async () => {
    const wrapper = mountChart({ focusKey: 'reconciliation' });

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
  });

  it('点击含事件的数据点时才会发出 select-date', async () => {
    const wrapper = mountChart();
    await flushPromises();
    await nextTick();

    await wrapper.findComponent({ name: 'VChart' }).vm.$emit('click', { dataIndex: 1 });
    expect(wrapper.emitted('select-date')).toEqual([['2026-03-09']]);

    await wrapper.findComponent({ name: 'VChart' }).vm.$emit('click', { dataIndex: 99 });
    await wrapper.findComponent({ name: 'VChart' }).vm.$emit('click', { dataIndex: 0 });

    expect(wrapper.emitted('select-date')).toEqual([
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
