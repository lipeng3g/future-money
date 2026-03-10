import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  __resetChartRuntimeRegistryForTests,
  getSharedChartRuntime,
  preloadChartRuntime,
  scheduleChartRuntimePreload,
} from '@/utils/chart-runtime-preload';

describe('chart-runtime-preload', () => {
  afterEach(() => {
    __resetChartRuntimeRegistryForTests();
    vi.restoreAllMocks();
  });

  it('共享 runtime 句柄会在预热与组件挂载之间复用同一份加载状态', async () => {
    const loader = vi.fn().mockResolvedValue(undefined);

    const preloaded = await preloadChartRuntime('balance', loader);
    const reused = getSharedChartRuntime('balance', loader);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(reused).toBe(preloaded);
    expect(reused.ready.value).toBe(true);
  });

  it('调度预热时会在 idle 回调里静默执行全部任务', async () => {
    let scheduledCallback: (() => void) | null = null;
    const idleCallback = vi.fn((callback: () => void) => {
      scheduledCallback = callback;
      return 1;
    });
    const taskA = vi.fn().mockResolvedValue(undefined);
    const taskB = vi.fn().mockRejectedValue(new Error('boom'));

    scheduleChartRuntimePreload([taskA, taskB], { idleCallback, timeoutMs: 500 });

    expect(idleCallback).toHaveBeenCalledTimes(1);
    expect(taskA).not.toHaveBeenCalled();
    expect(taskB).not.toHaveBeenCalled();

    scheduledCallback?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(taskA).toHaveBeenCalledTimes(1);
    expect(taskB).toHaveBeenCalledTimes(1);
  });

  it('取消预热后不会再执行尚未触发的 idle 任务', () => {
    let scheduledCallback: (() => void) | null = null;
    const idleCallback = vi.fn((callback: () => void) => {
      scheduledCallback = callback;
      return 2;
    });
    const task = vi.fn().mockResolvedValue(undefined);

    const cancel = scheduleChartRuntimePreload([task], { idleCallback });
    cancel();
    scheduledCallback?.();

    expect(task).not.toHaveBeenCalled();
  });
});
