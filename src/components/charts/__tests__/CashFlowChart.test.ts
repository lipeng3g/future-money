import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import CashFlowChart from '@/components/charts/CashFlowChart.vue';
import type { MonthlySnapshot } from '@/types/analytics';
import { __resetChartRuntimeRegistryForTests } from '@/utils/chart-runtime-preload';

const AButtonStub = defineComponent({
  name: 'AButton',
  props: {
    size: String,
  },
  template: '<button class="a-button"><slot /></button>',
});

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
    monthLabel: '2026-01',
    income: 12000,
    expense: 6800,
    net: 5200,
  },
  {
    monthLabel: '2026-02',
    income: 9800,
    expense: 7600,
    net: 2200,
  },
];

beforeEach(() => {
  cashflowRuntimeHook.mockReset();
  cashflowRuntimeHook.mockResolvedValue(undefined);
});

afterEach(() => {
  __resetChartRuntimeRegistryForTests();
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
      global: {
        components: {
          'a-button': AButtonStub,
        },
      },
    });

    await flushPromises();
    await nextTick();

    expect(wrapper.find('.chart-runtime-error').exists()).toBe(true);
    expect(wrapper.text()).toContain('图表加载失败');
    expect(wrapper.text()).toContain('图表引擎加载失败，请稍后重试。');
    expect(wrapper.text()).toContain('可先重试一次；若仍失败，再刷新页面继续。');
    expect(wrapper.find('.chart-runtime-error-action').exists()).toBe(true);
    expect(wrapper.find('.v-chart').exists()).toBe(false);

    await wrapper.find('.a-button').trigger('click');
    await flushPromises();
    await nextTick();

    expect(cashflowRuntimeHook).toHaveBeenCalledTimes(2);
    expect(wrapper.find('.chart-runtime-error').exists()).toBe(false);
    expect(wrapper.find('.v-chart').exists()).toBe(true);
  });


  it('空月度数据时展示空态而不是图表容器（且不展示导出按钮）', () => {
    const wrapper = mount(CashFlowChart, {
      props: {
        months: [],
      },
    });

    expect(wrapper.text()).toContain('还没有月度收支数据');
    expect(wrapper.find('.chart-empty-state').exists()).toBe(true);
    expect(wrapper.find('.v-chart').exists()).toBe(false);
    expect(wrapper.find('.chart-export').exists()).toBe(false);
  });

  it('支持把月度收支导出为 CSV', async () => {
    const wrapper = mount(CashFlowChart, {
      props: {
        months,
      },
    });

    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createObjectUrlMock = vi.fn(() => 'blob:mock-url');
    const revokeObjectUrlMock = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (URL as any).createObjectURL = createObjectUrlMock;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (URL as any).revokeObjectURL = revokeObjectUrlMock;

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    await wrapper.find('.chart-export').trigger('click');

    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    clickSpy.mockRestore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (URL as any).createObjectURL = originalCreateObjectURL;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (URL as any).revokeObjectURL = originalRevokeObjectURL;
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
      global: {
        components: {
          'a-button': AButtonStub,
        },
      },
    });

    expect(wrapper.text()).toContain('正在加载图表引擎');
    expect(wrapper.find('.chart-export').exists()).toBe(true);
    expect(wrapper.find('.v-chart').exists()).toBe(false);

    resolveLoader?.();
    await flushPromises();
    await nextTick();

    expect(wrapper.find('.chart-loading-state').exists()).toBe(false);
    expect(wrapper.find('.v-chart').exists()).toBe(true);
  });
});
