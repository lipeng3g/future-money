import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ChartArea from '@/components/charts/ChartArea.vue';
import type { ComponentMountingOptions } from '@vue/test-utils';
import { useFinanceStore } from '@/stores/finance';

vi.mock('ant-design-vue', async () => {
  const actual = await vi.importActual<typeof import('ant-design-vue')>('ant-design-vue');
  return {
    ...actual,
    message: {
      success: vi.fn(),
    },
  };
});

const createAsyncComponentMock = (name: string, className: string) => ({
  __esModule: true,
  __isTeleport: false,
  __isKeepAlive: false,
  default: defineComponent({
    name,
    props: name === 'BalanceChart'
      ? ['timeline', 'warningThreshold', 'chartType', 'showWeekends', 'reconciliationDate', 'reconciliationBalance', 'focusKey', 'focusDate']
      : name === 'CashFlowChart'
        ? ['months']
        : [],
    emits: name === 'BalanceChart' ? ['select-date'] : [],
    template: `<div :class="className">${name}</div>`,
    setup() {
      return { className };
    },
  }),
});

vi.mock('@/components/charts/BalanceChart.vue', () => createAsyncComponentMock('BalanceChart', 'balance-chart-stub'));
vi.mock('@/components/charts/CashFlowChart.vue', () => createAsyncComponentMock('CashFlowChart', 'cashflow-chart-stub'));
vi.mock('@/components/reconciliation/ReconciliationModal.vue', () => createAsyncComponentMock('ReconciliationModal', 'reconciliation-modal-stub'));
vi.mock('@/components/ai/AiAnalysisModal.vue', () => createAsyncComponentMock('AiAnalysisModal', 'ai-analysis-modal-stub'));
vi.mock('@/components/ai/AiConfigModal.vue', () => createAsyncComponentMock('AiConfigModal', 'ai-config-modal-stub'));

const TimeRangeControlStub = defineComponent({
  name: 'TimeRangeControl',
  props: ['value'],
  emits: ['change'],
  template: `
    <div class="time-range-control-stub">
      <button class="range-to-24" @click="$emit('change', 24)">24</button>
      <button class="range-to-invalid" @click="$emit('change', Number.NaN)">invalid</button>
      <span class="current-range">{{ value }}</span>
    </div>
  `,
});

const StatisticsPanelStub = defineComponent({
  name: 'StatisticsPanel',
  props: ['analytics'],
  emits: ['focus-chart'],
  template: `
    <div class="statistics-panel-stub">
      <button class="stats-focus-warning" @click="$emit('focus-chart', 'warning')">warning</button>
      <button class="stats-focus-min" @click="$emit('focus-chart', 'min')">min</button>
    </div>
  `,
});

const UpcomingEventsStub = defineComponent({
  name: 'UpcomingEvents',
  props: ['timeline'],
  emits: ['focus-date'],
  template: '<button class="upcoming-events-stub" @click="$emit(\'focus-date\', \'2026-03-20\')">upcoming</button>',
});

const ReconciliationBannerStub = defineComponent({
  name: 'ReconciliationBanner',
  emits: ['reconcile', 'open-drawer'],
  template: '<div class="reconciliation-banner-stub" />',
});

const AppIconStub = defineComponent({
  name: 'AppIcon',
  props: ['name', 'size'],
  template: '<span class="app-icon-stub" />',
});

type ObserverInstance = {
  callback: IntersectionObserverCallback;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
};

let observerInstances: ObserverInstance[] = [];

class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  observe = vi.fn();
  disconnect = vi.fn();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    observerInstances.push(this);
  }
}

const flushAsyncComponents = async () => {
  await flushPromises();
  await flushPromises();
  await nextTick();
};

const mountChartArea = (options: ComponentMountingOptions<typeof ChartArea> = {}) => mount(ChartArea, {
  ...options,
  global: {
    ...(options.global ?? {}),
    stubs: {
      TimeRangeControl: TimeRangeControlStub,
      StatisticsPanel: StatisticsPanelStub,
      UpcomingEvents: UpcomingEventsStub,
      ReconciliationBanner: ReconciliationBannerStub,
      AppIcon: AppIconStub,
      ...(options.global?.stubs ?? {}),
    },
  },
});

describe('ChartArea', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    setActivePinia(createPinia());
    observerInstances = [];
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver as unknown as typeof IntersectionObserver);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('图表进入视口前先展示骨架，占位不立即加载重图表', async () => {
    const store = useFinanceStore();
    store.reconcile('2026-03-01', 5000, [], '初始对账');

    const wrapper = mountChartArea();
    await nextTick();

    expect(observerInstances).toHaveLength(2);
    expect(wrapper.text()).toContain('正在按需加载余额图');
    expect(wrapper.text()).toContain('滚动到这里时再加载月度图表');
    expect(wrapper.find('.balance-chart-stub').exists()).toBe(false);
    expect(wrapper.find('.cashflow-chart-stub').exists()).toBe(false);
  });

  it('对应卡片进入视口后才分别加载余额图和月度图', async () => {
    const store = useFinanceStore();
    store.reconcile('2026-03-01', 5000, [], '初始对账');

    const wrapper = mountChartArea();
    await nextTick();

    observerInstances[0]?.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    await flushAsyncComponents();

    expect(wrapper.find('.balance-chart-stub').exists()).toBe(true);
    expect(wrapper.find('.cashflow-chart-stub').exists()).toBe(false);

    observerInstances[1]?.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    await flushAsyncComponents();

    expect(wrapper.find('.cashflow-chart-stub').exists()).toBe(true);
  });

  it('观察器迟迟不触发时，会按兜底定时器逐步加载图表，避免永久骨架', async () => {
    const store = useFinanceStore();
    store.reconcile('2026-03-01', 5000, [], '初始对账');

    const wrapper = mountChartArea();
    await nextTick();

    expect(wrapper.find('.balance-chart-stub').exists()).toBe(false);
    expect(wrapper.find('.cashflow-chart-stub').exists()).toBe(false);

    await vi.advanceTimersByTimeAsync(1800);
    await flushAsyncComponents();

    expect(wrapper.find('.balance-chart-stub').exists()).toBe(true);
    expect(wrapper.find('.cashflow-chart-stub').exists()).toBe(false);

    await vi.advanceTimersByTimeAsync(800);
    await flushAsyncComponents();

    expect(wrapper.find('.cashflow-chart-stub').exists()).toBe(true);
  });

  it('切换预测范围时会通过容器接线更新 store，并把新范围传给图表数据源', async () => {
    const store = useFinanceStore();
    store.reconcile('2026-03-01', 5000, [], '初始对账');

    const wrapper = mountChartArea();
    await nextTick();

    observerInstances[0]?.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    observerInstances[1]?.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    await flushAsyncComponents();

    const balanceChart = wrapper.findComponent({ name: 'BalanceChart' });
    const initialTimelineLength = (balanceChart.props('timeline') as unknown[]).length;
    expect(store.viewMonths).toBe(12);
    expect(initialTimelineLength).toBeGreaterThan(0);

    await wrapper.find('.range-to-24').trigger('click');
    await flushAsyncComponents();

    const updatedBalanceChart = wrapper.findComponent({ name: 'BalanceChart' });

    expect(store.viewMonths).toBe(24);
    expect(store.preferences.defaultViewMonths).toBe(24);
    expect((updatedBalanceChart.props('timeline') as unknown[]).length).toBeGreaterThan(initialTimelineLength);
  });

  it('预测范围控件若意外发出非法值，容器仍会回退到默认范围并同步持久化', async () => {
    const store = useFinanceStore();
    store.reconcile('2026-03-01', 5000, [], '初始对账');

    const wrapper = mountChartArea();
    await nextTick();

    observerInstances[0]?.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    await flushAsyncComponents();

    await wrapper.find('.range-to-invalid').trigger('click');
    await flushAsyncComponents();

    expect(store.viewMonths).toBe(12);
    expect(store.preferences.defaultViewMonths).toBe(12);
    expect(wrapper.find('.current-range').text()).toBe('12');
  });

  it('没有图表数据时会直接渲染真实空态，而不是先卡在延迟骨架', async () => {
    const wrapper = mountChartArea();
    await nextTick();
    await flushAsyncComponents();

    expect(wrapper.find('.balance-chart-stub').exists()).toBe(true);
    expect(wrapper.find('.cashflow-chart-stub').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('正在按需加载余额图');
    expect(wrapper.text()).not.toContain('滚动到这里时再加载月度图表');
  });

  it('外部 focusDate 在图表挂载前后都能正确传递，并在清空时退出事件定位态', async () => {
    const store = useFinanceStore();
    store.reconcile('2026-03-01', 5000, [], '初始对账');

    const wrapper = mountChartArea({
      props: {
        focusDate: '2026-03-20',
        focusNonce: 1,
      },
    });
    await nextTick();

    expect(wrapper.find('.balance-chart-stub').exists()).toBe(false);

    observerInstances[0]?.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    await flushAsyncComponents();

    let balanceChart = wrapper.findComponent({ name: 'BalanceChart' });
    expect(balanceChart.props('focusDate')).toBe('2026-03-20');

    await wrapper.setProps({
      focusDate: '2026-03-09',
      focusNonce: 2,
    });
    await flushAsyncComponents();

    balanceChart = wrapper.findComponent({ name: 'BalanceChart' });
    expect(balanceChart.props('focusDate')).toBe('2026-03-09');

    await wrapper.setProps({
      focusDate: null,
      focusNonce: 3,
    });
    await flushAsyncComponents();

    balanceChart = wrapper.findComponent({ name: 'BalanceChart' });
    expect(balanceChart.props('focusDate')).toBeUndefined();
  });

  it('统计卡片触发 focus-chart 时，容器会把焦点 key 传给余额图，并退出先前的日期定位态', async () => {
    const store = useFinanceStore();
    store.reconcile('2026-03-01', 5000, [], '初始对账');

    const wrapper = mountChartArea({
      props: {
        focusDate: '2026-03-20',
        focusNonce: 1,
      },
    });
    await nextTick();

    observerInstances[0]?.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    await flushAsyncComponents();

    let balanceChart = wrapper.findComponent({ name: 'BalanceChart' });
    expect(balanceChart.props('focusDate')).toBe('2026-03-20');

    await wrapper.find('.stats-focus-warning').trigger('click');
    await flushAsyncComponents();

    balanceChart = wrapper.findComponent({ name: 'BalanceChart' });
    expect(balanceChart.props('focusKey')).toBe('warning');
    expect(balanceChart.props('focusDate')).toBeUndefined();

    await wrapper.find('.stats-focus-min').trigger('click');
    await flushAsyncComponents();

    balanceChart = wrapper.findComponent({ name: 'BalanceChart' });
    expect(balanceChart.props('focusKey')).toBe('min');
    expect(balanceChart.props('focusDate')).toBeUndefined();
  });

  it('即将发生侧栏触发 focus-date 时，容器会把日期定位传给余额图', async () => {
    const store = useFinanceStore();
    store.reconcile('2026-03-01', 5000, [], '初始对账');

    const wrapper = mountChartArea();
    await nextTick();

    observerInstances[0]?.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    await flushAsyncComponents();

    await wrapper.find('.upcoming-events-stub').trigger('click');
    await flushAsyncComponents();

    const balanceChart = wrapper.findComponent({ name: 'BalanceChart' });
    expect(balanceChart.props('focusDate')).toBe('2026-03-20');
    expect(balanceChart.props('focusKey')).toBe('latest');
  });
});
