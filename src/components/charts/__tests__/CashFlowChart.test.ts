import { describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import CashFlowChart from '@/components/charts/CashFlowChart.vue';
import type { MonthlySnapshot } from '@/types/analytics';

vi.mock('vue-echarts', () => ({
  default: defineComponent({
    name: 'VChart',
    props: ['option', 'autoresize'],
    template: '<div class="v-chart"></div>',
  }),
}));

vi.mock('@/utils/echarts-cashflow', () => ({}));

const months: MonthlySnapshot[] = [
  {
    month: '2026-01',
    income: 12000,
    expense: 6800,
    net: 5200,
  },
  {
    month: '2026-02',
    income: 9800,
    expense: 7600,
    net: 2200,
  },
];

describe('CashFlowChart', () => {
  it('空月度数据时展示空态而不是图表容器', () => {
    const wrapper = mount(CashFlowChart, {
      props: {
        months: [],
      },
    });

    expect(wrapper.text()).toContain('还没有月度收支数据');
    expect(wrapper.find('.chart-empty-state').exists()).toBe(true);
    expect(wrapper.find('.v-chart').exists()).toBe(false);
  });

  it('runtime 就绪前先展示加载态，完成后再渲染图表', async () => {
    const wrapper = mount(CashFlowChart, {
      props: {
        months,
      },
    });

    expect(wrapper.text()).toContain('正在加载图表引擎');
    expect(wrapper.find('.v-chart').exists()).toBe(false);

    await flushPromises();
    await nextTick();

    expect(wrapper.find('.chart-loading-state').exists()).toBe(false);
    expect(wrapper.find('.v-chart').exists()).toBe(true);
  });
});
