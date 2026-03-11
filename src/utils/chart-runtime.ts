import { ref } from 'vue';

export type ChartRuntimeErrorKind = 'offline' | 'timeout' | 'chunk' | 'unknown';

export interface AsyncChartRuntimeState {
  ready: Readonly<ReturnType<typeof ref<boolean>>>;
  loading: Readonly<ReturnType<typeof ref<boolean>>>;
  error: Readonly<ReturnType<typeof ref<string | null>>>;
  errorAction: Readonly<ReturnType<typeof ref<string | null>>>;
  errorKind: Readonly<ReturnType<typeof ref<ChartRuntimeErrorKind | null>>>;
  ensureReady: () => Promise<void>;
  retry: () => Promise<void>;
}

const DEFAULT_ERROR_MESSAGE = '图表引擎加载失败，请稍后重试。';
const DEFAULT_TIMEOUT_MS = 12_000;
const TIMEOUT_ERROR_CODE = 'FM_CHART_RUNTIME_TIMEOUT';

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error ?? ''));

const isTimeoutError = (error: unknown) => {
  const message = getErrorMessage(error);
  return message.includes(TIMEOUT_ERROR_CODE) || /timeout|timed out/i.test(message);
};

const isOfflineLikeError = (error: unknown) => {
  const message = getErrorMessage(error);
  return /fetch|importing a module script failed|failed to fetch dynamically imported module|networkerror|network error|load failed|loading chunk|chunkloaderror|err_internet_disconnected|err_connection_refused|err_name_not_resolved/i.test(message);
};

const isChunkLikeError = (error: unknown) => {
  const message = getErrorMessage(error);
  return /importing a module script failed|failed to fetch dynamically imported module|load failed|loading chunk|chunkloaderror/i.test(message);
};

export const getChartRuntimeErrorKind = (error: unknown): ChartRuntimeErrorKind => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'offline';
  }

  if (isTimeoutError(error)) {
    return 'timeout';
  }

  if (isChunkLikeError(error)) {
    return 'chunk';
  }

  return 'unknown';
};

export const getChartRuntimeErrorMessage = (
  error: unknown,
  fallbackMessage = DEFAULT_ERROR_MESSAGE,
) => {
  const kind = getChartRuntimeErrorKind(error);

  if (kind === 'offline') {
    return '当前设备似乎离线了，图表引擎还没下载成功。请检查网络后重试。';
  }

  if (kind === 'timeout') {
    return '图表引擎加载超时了，可能网络较慢或资源被拦截。刷新页面或稍后重试即可。';
  }

  if (isOfflineLikeError(error)) {
    return '图表引擎下载失败了，可能是网络抖动或资源加载被中断。刷新页面或稍后重试即可。';
  }

  return fallbackMessage;
};

export const getChartRuntimeErrorAction = (error: unknown) => {
  const kind = getChartRuntimeErrorKind(error);

  if (kind === 'offline') {
    return '建议先检查网络连接，再点击“重试加载”。';
  }

  if (kind === 'timeout') {
    return '如果连续重试仍超时，优先刷新页面重新下载图表资源；必要时检查网络/代理。';
  }

  if (kind === 'chunk') {
    return '如果连续重试仍失败，优先刷新页面重新下载图表资源。';
  }

  return '可先重试一次；若仍失败，再刷新页面继续。';
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${TIMEOUT_ERROR_CODE}:${timeoutMs}`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

export const createAsyncChartRuntime = (
  loader: () => Promise<unknown>,
  errorMessage = DEFAULT_ERROR_MESSAGE,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): AsyncChartRuntimeState => {
  const ready = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const errorAction = ref<string | null>(null);
  const errorKind = ref<ChartRuntimeErrorKind | null>(null);
  let pending: Promise<void> | null = null;

  const run = async () => {
    if (ready.value) return;
    if (pending) return pending;

    loading.value = true;
    error.value = null;
    errorAction.value = null;
    errorKind.value = null;

    let loadPromise: Promise<unknown>;
    try {
      loadPromise = Promise.resolve(loader());
    } catch (runtimeError) {
      loadPromise = Promise.reject(runtimeError);
    }

    pending = withTimeout(loadPromise, timeoutMs)
      .then(() => {
        ready.value = true;
      })
      .catch((runtimeError) => {
        ready.value = false;
        errorKind.value = getChartRuntimeErrorKind(runtimeError);
        error.value = getChartRuntimeErrorMessage(runtimeError, errorMessage);
        errorAction.value = getChartRuntimeErrorAction(runtimeError);
      })
      .finally(() => {
        loading.value = false;
        pending = null;
      });

    return pending;
  };

  const retry = async () => {
    ready.value = false;
    await run();
  };

  return {
    ready,
    loading,
    error,
    errorAction,
    errorKind,
    ensureReady: run,
    retry,
  };
};
