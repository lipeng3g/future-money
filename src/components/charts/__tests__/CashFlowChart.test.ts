import { beforeEach, describe, expect, it, vi } from 'vitest';
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

const cashflowRuntimeHook = vi.fn();
vi.mock('@/utils/echarts-cashflow', async () => {
  await cashflowRuntimeHook();
  return {};
});

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

beforeEach(() => {
  cashflowRuntimeHook.mockReset();
  cashflowRuntimeHook.mockResolvedValue(undefined);
});

describe('CashFlowChart', () => {
  it('runtime 加载失败时会展示错误态，并允许重试恢复', async () => {
    cashflowRuntimeHook
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined);

    const wrapper = mount(CashFlowChart, {
      props: {
        months,
      },
    });

    await flushPromises();
    await nextTick();

    expect(wrapper.find('.chart-runtime-error').exists()).toBe(true);
    expect(wrapper.text()).toContain('图表暂时没加载出来');
    expect(wrapper.text()).toContain('图表引擎加载失败，请稍后重试。');
    expect(wrapper.find('.v-chart').exists()).toBe(false);

    await wrapper.find('.retry-button').trigger('click');
    await flushPromises();
    await nextTick();

    expect(cashflowRuntimeHook).toHaveBeenCalledTimes(2);
    expect(wrapper.find('.chart-runtime-error').exists()).toBe(false);
    expect(wrapper.find('.v-chart').exists()).toBe(true);
  });

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
    let resolveLoader: (() => void) | null = null;
    cashflowRuntimeHook.mockImplementationOnce(() => new Promise<void>((resolve) => {
      resolveLoader = resolve;
    }));

    const wrapper = mount(CashFlowChart, {
      props: {
        months,
      },
    });

    expect(wrapper.text()).toContain('正在加载图表引擎');
    expect(wrapper.find('.v-chart').exists()).toBe(false);

    resolveLoader?.();
    await flushPromises();
    await nextTick();

    expect(wrapper.find('.chart-loading-state').exists()).toBe(false);
    expect(wrapper.find('.v-chart').exists()).toBe(true);
  });

});
