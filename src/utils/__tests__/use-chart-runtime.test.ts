import { describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useChartRuntime } from '@/utils/use-chart-runtime';

describe('useChartRuntime', () => {
  it('挂载后会自动触发 runtime 加载', async () => {
    const loader = vi.fn().mockResolvedValue(undefined);

    const Probe = defineComponent({
      setup() {
        const runtime = useChartRuntime(loader);
        return { runtime };
      },
      template: '<div>{{ runtime.ready ? "ready" : "loading" }}</div>',
    });

    mount(Probe);
    await Promise.resolve();
    await nextTick();

    expect(loader).toHaveBeenCalledTimes(1);
  });
});
