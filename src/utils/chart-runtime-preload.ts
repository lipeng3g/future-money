import { createAsyncChartRuntime, type AsyncChartRuntimeState } from '@/utils/chart-runtime';

export type ChartRuntimePreloadHandle = Pick<AsyncChartRuntimeState, 'ensureReady' | 'retry' | 'ready' | 'loading' | 'error' | 'errorAction'>;

const runtimeRegistry = new Map<string, ChartRuntimePreloadHandle>();

const getRuntimeHandle = (
  key: string,
  loader: () => Promise<unknown>,
  errorMessage?: string,
): ChartRuntimePreloadHandle => {
  const cached = runtimeRegistry.get(key);
  if (cached) return cached;

  const runtime = createAsyncChartRuntime(loader, errorMessage);
  runtimeRegistry.set(key, runtime);
  return runtime;
};

export const getSharedChartRuntime = (
  key: string,
  loader: () => Promise<unknown>,
  errorMessage?: string,
) => getRuntimeHandle(key, loader, errorMessage);

export const preloadChartRuntime = async (
  key: string,
  loader: () => Promise<unknown>,
  errorMessage?: string,
) => {
  const runtime = getRuntimeHandle(key, loader, errorMessage);
  await runtime.ensureReady();
  return runtime;
};

export const scheduleChartRuntimePreload = (
  tasks: Array<() => Promise<unknown>>,
  options?: {
    timeoutMs?: number;
    idleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  },
) => {
  if (typeof window === 'undefined') return () => {};

  let cancelled = false;
  const run = () => {
    if (cancelled) return;

    tasks.forEach((task) => {
      void task().catch(() => {
        // 静默预热：失败状态留给真正挂载时展示，不在预热阶段打断界面。
      });
    });
  };

  const idleCallback = options?.idleCallback
    ?? (typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback.bind(window)
      : null);

  if (idleCallback) {
    const id = idleCallback(run, { timeout: options?.timeoutMs ?? 1200 });
    return () => {
      cancelled = true;
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(id);
      }
    };
  }

  const timerId = window.setTimeout(run, 0);
  return () => {
    cancelled = true;
    window.clearTimeout(timerId);
  };
};

export const __resetChartRuntimeRegistryForTests = () => {
  runtimeRegistry.clear();
};
