import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAsyncChartRuntime, getChartRuntimeErrorMessage } from '@/utils/chart-runtime';

describe('createAsyncChartRuntime', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

describe('getChartRuntimeErrorMessage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('离线时会返回更可执行的中文提示', () => {
    vi.stubGlobal('navigator', { onLine: false });

    expect(getChartRuntimeErrorMessage(new Error('boom'))).toBe('当前设备似乎离线了，图表引擎还没下载成功。请检查网络后重试。');
  });

  it('动态 import 网络失败时会返回下载失败提示', () => {
    vi.stubGlobal('navigator', { onLine: true });

    expect(getChartRuntimeErrorMessage(new Error('Failed to fetch dynamically imported module')))
      .toBe('图表引擎下载失败了，可能是网络抖动或资源加载被中断。刷新页面或稍后重试即可。');
  });

  it('未知错误时回退到默认或自定义文案', () => {
    vi.stubGlobal('navigator', { onLine: true });

    expect(getChartRuntimeErrorMessage(new Error('boom'))).toBe('图表引擎加载失败，请稍后重试。');
    expect(getChartRuntimeErrorMessage(new Error('boom'), '自定义失败文案')).toBe('自定义失败文案');
  });
});
