import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, reactive } from 'vue';
import type { AnalyticsSummary } from '@/types/analytics';
import type { DailySnapshot } from '@/types/timeline';

const mockStore = reactive({
  viewMonths: 12,
  setViewMonths: vi.fn(),
  analytics: {
    months: [
      { monthLabel: '2026-03', income: 5000, expense: 3200, net: 1800 },
    ],
    extremes: {
      minBalance: 900,
      minDate: '2026-03-09',
      maxBalance: 5400,
      maxDate: '2026-03-20',
    },
    totalIncome: 5000,
    totalExpense: 3200,
    endingBalance: 1800,
    warningDates: ['2026-03-09'],
  } as AnalyticsSummary,
  timeline: [
    {
      date: '2026-03-01',
      balance: 3200,
      change: 0,
      events: [],
      isWeekend: false,
      isToday: false,
      zone: 'frozen',
    },
    {
      date: '2026-03-09',
      balance: 900,
      change: -2300,
      events: [
        {
          id: 'occ-1',
          eventId: 'rule-1',
          name: '房租',
          category: 'expense',
          amount: 2300,
          date: '2026-03-09',
        },
      ],
      isWeekend: false,
      isToday: true,
      zone: 'projected',
    },
  ] as DailySnapshot[],
  warningThreshold: 1000,
  preferences: {
    chartType: 'area',
    showWeekends: false,
  },
  latestReconciliation: {
    id: 'rec-1',
    accountId: 'acc-1',
    date: '2026-03-01',
    balance: 3200,
    note: '',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  },
  events: [
    {
      id: 'rule-1',
      accountId: 'acc-1',
      name: '房租',
    },
  ],
});

vi.mock('ant-design-vue', () => ({
  message: {
    success: vi.fn(),
  },
}));

vi.mock('@/stores/finance', () => ({
  useFinanceStore: () => mockStore,
}));

vi.mock('@/components/charts/BalanceChart.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  default: defineComponent({
    name: 'BalanceChart',
    props: ['focusKey', 'focusDate', 'timeline', 'warningThreshold'],
    emits: ['select-date'],
    template: `
      <div class="balance-chart-stub">
        <span class="focus-key">{{ focusKey }}</span>
        <span class="focus-date">{{ focusDate ?? '' }}</span>
        <button class="emit-select-date" @click="$emit('select-date', '2026-03-09')">emit</button>
      </div>
    `,
  }),
}));

vi.mock('@/components/charts/CashFlowChart.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  default: defineComponent({
    name: 'CashFlowChart',
    props: ['months'],
    template: '<div class="cashflow-chart-stub">cashflow</div>',
  }),
}));

vi.mock('@/components/charts/StatisticsPanel.vue', () => ({
  default: defineComponent({
    name: 'StatisticsPanel',
    props: ['analytics'],
    emits: ['focus-chart'],
    template: `
      <div class="statistics-panel-stub">
        <button class="focus-warning" @click="$emit('focus-chart', 'warning')">warning</button>
        <button class="focus-max" @click="$emit('focus-chart', 'max')">max</button>
      </div>
    `,
  }),
}));

vi.mock('@/components/charts/TimeRangeControl.vue', () => ({
  default: defineComponent({
    name: 'TimeRangeControl',
    props: ['value'],
    emits: ['change'],
    template: '<button class="time-range-control" @click="$emit(\'change\', 24)">range</button>',
  }),
}));

vi.mock('@/components/charts/UpcomingEvents.vue', () => ({
  default: defineComponent({
    name: 'UpcomingEvents',
    props: ['timeline'],
    template: '<div class="upcoming-events-stub">upcoming</div>',
  }),
}));

vi.mock('@/components/reconciliation/ReconciliationBanner.vue', () => ({
  default: defineComponent({
    name: 'ReconciliationBanner',
    emits: ['reconcile', 'open-drawer'],
    template: '<div class="reconciliation-banner-stub">banner</div>',
  }),
}));

vi.mock('@/components/common/AppIcon.vue', () => ({
  default: defineComponent({
    name: 'AppIcon',
    template: '<span class="app-icon-stub"></span>',
  }),
}));

vi.mock('@/components/reconciliation/ReconciliationModal.vue', () => ({
  default: defineComponent({
    name: 'ReconciliationModal',
    template: '<div class="reconciliation-modal-stub"></div>',
  }),
}));

vi.mock('@/components/ai/AiAnalysisModal.vue', () => ({
  default: defineComponent({
    name: 'AiAnalysisModal',
    template: '<div class="ai-analysis-modal-stub"></div>',
  }),
}));

vi.mock('@/components/ai/AiConfigModal.vue', () => ({
  default: defineComponent({
    name: 'AiConfigModal',
    template: '<div class="ai-config-modal-stub"></div>',
  }),
}));

vi.mock('@/utils/ai', () => ({
  loadAiConfig: vi.fn().mockResolvedValue({ apiKey: 'demo-key' }),
}));

import ChartArea from '@/components/charts/ChartArea.vue';

const mountChartArea = (props: Record<string, unknown> = {}) => mount(ChartArea, {
  props,
});

describe('ChartArea', () => {
  beforeEach(() => {
    mockStore.viewMonths = 12;
    mockStore.setViewMonths.mockClear();
  });

  it('会把统计卡片点击映射为余额图 focusKey，并清空旧的 focusDate', async () => {
    const wrapper = mountChartArea({
      focusDate: '2026-03-09',
      focusNonce: 1,
    });

    await flushPromises();

    expect(wrapper.find('.focus-key').text()).toBe('latest');
    expect(wrapper.find('.focus-date').text()).toBe('2026-03-09');

    await wrapper.find('.focus-max').trigger('click');
    await flushPromises();

    expect(wrapper.find('.focus-key').text()).toBe('max');
    expect(wrapper.find('.focus-date').text()).toBe('');

    await wrapper.find('.focus-warning').trigger('click');
    await flushPromises();

    expect(wrapper.find('.focus-key').text()).toBe('warning');
    expect(wrapper.find('.focus-date').text()).toBe('');
  });

  it('会在外部 focusNonce 更新时重新把指定日期传给余额图，并把图表点击回传给父层', async () => {
    const wrapper = mountChartArea();

    await flushPromises();

    expect(wrapper.find('.focus-key').text()).toBe('latest');
    expect(wrapper.find('.focus-date').text()).toBe('');

    await wrapper.setProps({
      focusDate: '2026-03-01',
      focusNonce: 2,
    });
    await flushPromises();

    expect(wrapper.find('.focus-key').text()).toBe('latest');
    expect(wrapper.find('.focus-date').text()).toBe('2026-03-01');

    await wrapper.find('.emit-select-date').trigger('click');
    expect(wrapper.emitted('focusEventsByDate')).toEqual([['2026-03-09']]);
  });

  it('会把时间范围控件的修改转交给 store', async () => {
    const wrapper = mountChartArea();

    await flushPromises();
    await wrapper.find('.time-range-control').trigger('click');

    expect(mockStore.setViewMonths).toHaveBeenCalledWith(24);
  });
});
