import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useChartRuntime } from '@/utils/use-chart-runtime';
import { __resetChartRuntimeRegistryForTests } from '@/utils/chart-runtime-preload';

describe('useChartRuntime', () => {
  afterEach(() => {
    __resetChartRuntimeRegistryForTests();
  });

  it('挂载后会自动触发 runtime 加载', async () => {
    const loader = vi.fn().mockResolvedValue(undefined);

    const Probe = defineComponent({
      setup() {
        const runtime = useChartRuntime('balance', loader);
        return { runtime };
      },
      template: '<div>{{ runtime.ready ? "ready" : "loading" }}</div>',
    });

    mount(Probe);
    await Promise.resolve();
    await nextTick();

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('同 key 的不同组件会复用同一份共享 runtime，而不是重复加载', async () => {
    const loader = vi.fn().mockResolvedValue(undefined);

    const Probe = defineComponent({
      setup() {
        const runtime = useChartRuntime('balance', loader);
        return { runtime };
      },
      template: '<div>{{ runtime.ready ? "ready" : "loading" }}</div>',
    });

    mount(Probe);
    mount(Probe);
    await Promise.resolve();
    await nextTick();

    expect(loader).toHaveBeenCalledTimes(1);
  });
});
