import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAsyncChartRuntime,
  getChartRuntimeErrorAction,
  getChartRuntimeErrorMessage,
} from '@/utils/chart-runtime';

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
    expect(runtime.errorAction.value).toBeNull();
  });

  it('失败后会暴露错误与建议动作，并允许 retry 成功恢复', async () => {
    const loader = vi
      .fn<[], Promise<void>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce();

    const runtime = createAsyncChartRuntime(loader, '自定义失败文案');

    await runtime.ensureReady();
    expect(runtime.ready.value).toBe(false);
    expect(runtime.error.value).toBe('自定义失败文案');
    expect(runtime.errorAction.value).toBe('可先重试一次；若仍失败，再刷新页面继续。');

    await runtime.retry();
    expect(loader).toHaveBeenCalledTimes(2);
    expect(runtime.ready.value).toBe(true);
    expect(runtime.error.value).toBeNull();
    expect(runtime.errorAction.value).toBeNull();
  });

  it('加载超时时会以错误状态收敛，不会永久停留在 loading', async () => {
    const loader = vi.fn(() => new Promise<void>(() => {
      // 永不 resolve，用于模拟 chunk 卡死/挂起
    }));

    const runtime = createAsyncChartRuntime(loader, '自定义失败文案', 10);

    await runtime.ensureReady();
    expect(runtime.ready.value).toBe(false);
    expect(runtime.loading.value).toBe(false);
    expect(runtime.error.value).toContain('超时');
    expect(runtime.errorAction.value).toContain('刷新');
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

describe('getChartRuntimeErrorAction', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('离线时会提示先检查网络', () => {
    vi.stubGlobal('navigator', { onLine: false });

    expect(getChartRuntimeErrorAction(new Error('boom'))).toBe('建议先检查网络连接，再点击“重试加载”。');
  });

  it('chunk 下载失败时会优先建议刷新页面', () => {
    vi.stubGlobal('navigator', { onLine: true });

    expect(getChartRuntimeErrorAction(new Error('Loading chunk 123 failed.')))
      .toBe('如果连续重试仍失败，优先刷新页面重新下载图表资源。');
  });

  it('未知错误时会回退到通用建议', () => {
    vi.stubGlobal('navigator', { onLine: true });

    expect(getChartRuntimeErrorAction(new Error('boom'))).toBe('可先重试一次；若仍失败，再刷新页面继续。');
  });
});
