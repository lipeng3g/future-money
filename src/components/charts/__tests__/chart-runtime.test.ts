import { describe, expect, it, vi } from 'vitest';
import { createAsyncChartRuntime } from '@/utils/chart-runtime';

describe('createAsyncChartRuntime', () => {
  it('should set offline-friendly message when navigator.onLine is false', async () => {
    const originalNavigator = globalThis.navigator;

    // navigator.onLine is often read-only; override via defineProperty.
    Object.defineProperty(globalThis, 'navigator', {
      value: { ...originalNavigator, onLine: false },
      configurable: true,
    });

    try {
      const loader = vi.fn(async () => {
        throw new Error('ChunkLoadError: loading chunk 123 failed');
      });

      const runtime = createAsyncChartRuntime(loader);
      await runtime.ensureReady();

      expect(runtime.ready.value).toBe(false);
      expect(runtime.error.value).toContain('离线');
      expect(runtime.errorAction.value).toContain('检查网络');
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
      });
    }
  });

  it('should surface timeout hint when loader never resolves', async () => {
    const loader = vi.fn(() => new Promise(() => {}));

    const runtime = createAsyncChartRuntime(loader, undefined, 10);
    await runtime.ensureReady();

    expect(runtime.ready.value).toBe(false);
    expect(runtime.error.value).toContain('超时');
    expect(runtime.errorAction.value).toContain('刷新');
  });
});
