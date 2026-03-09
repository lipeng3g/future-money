import { describe, expect, it, vi } from 'vitest';
import { createAsyncChartRuntime } from '@/utils/chart-runtime';

describe('createAsyncChartRuntime', () => {
  it('成功加载后会进入 ready 状态，并复用进行中的 promise', async () => {
    let resolveLoader: (() => void) | null = null;
    const loader = vi.fn(() => new Promise<void>((resolve) => {
      resolveLoader = resolve;
    }));

    const runtime = createAsyncChartRuntime(loader);
    const first = runtime.ensureReady();
    const second = runtime.ensureReady();

    expect(loader).toHaveBeenCalledTimes(1);
    expect(runtime.loading.value).toBe(true);

    resolveLoader?.();
    await first;
    await second;

    expect(runtime.ready.value).toBe(true);
    expect(runtime.loading.value).toBe(false);
    expect(runtime.error.value).toBeNull();
  });

  it('失败后会暴露错误，并允许 retry 成功恢复', async () => {
    const loader = vi
      .fn<[], Promise<void>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce();

    const runtime = createAsyncChartRuntime(loader, '自定义失败文案');

    await runtime.ensureReady();
    expect(runtime.ready.value).toBe(false);
    expect(runtime.error.value).toBe('自定义失败文案');

    await runtime.retry();
    expect(loader).toHaveBeenCalledTimes(2);
    expect(runtime.ready.value).toBe(true);
    expect(runtime.error.value).toBeNull();
  });
});
