import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ChartArea from '@/components/charts/ChartArea.vue';

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
    template: `<div class="${className}">${name}</div>`,
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
  template: '<div class="time-range-control-stub" />',
});

const StatisticsPanelStub = defineComponent({
  name: 'StatisticsPanel',
  props: ['analytics'],
  emits: ['focus-chart'],
  template: '<div class="statistics-panel-stub" />',
});

const UpcomingEventsStub = defineComponent({
  name: 'UpcomingEvents',
  props: ['timeline'],
  template: '<div class="upcoming-events-stub" />',
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

const mountChartArea = () => mount(ChartArea, {
  global: {
    stubs: {
      TimeRangeControl: TimeRangeControlStub,
      StatisticsPanel: StatisticsPanelStub,
      UpcomingEvents: UpcomingEventsStub,
      ReconciliationBanner: ReconciliationBannerStub,
      AppIcon: AppIconStub,
    },
  },
});

describe('ChartArea', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
    observerInstances = [];
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver as unknown as typeof IntersectionObserver);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('图表进入视口前先展示骨架，占位不立即加载重图表', async () => {
    const wrapper = mountChartArea();
    await nextTick();

    expect(observerInstances).toHaveLength(2);
    expect(wrapper.text()).toContain('正在按需加载余额图');
    expect(wrapper.text()).toContain('滚动到这里时再加载月度图表');
    expect(wrapper.find('.balance-chart-stub').exists()).toBe(false);
    expect(wrapper.find('.cashflow-chart-stub').exists()).toBe(false);
  });

  it('对应卡片进入视口后才分别加载余额图和月度图', async () => {
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
});
