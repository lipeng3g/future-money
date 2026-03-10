import { ref } from 'vue';

export interface AsyncChartRuntimeState {
  ready: Readonly<ReturnType<typeof ref<boolean>>>;
  loading: Readonly<ReturnType<typeof ref<boolean>>>;
  error: Readonly<ReturnType<typeof ref<string | null>>>;
  ensureReady: () => Promise<void>;
  retry: () => Promise<void>;
}

const DEFAULT_ERROR_MESSAGE = '图表引擎加载失败，请稍后重试。';

const isOfflineLikeError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /fetch|importing a module script failed|failed to fetch dynamically imported module|networkerror|network error|load failed|loading chunk|chunkloaderror/i.test(message);
};

export const getChartRuntimeErrorMessage = (
  error: unknown,
  fallbackMessage = DEFAULT_ERROR_MESSAGE,
) => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return '当前设备似乎离线了，图表引擎还没下载成功。请检查网络后重试。';
  }

  if (isOfflineLikeError(error)) {
    return '图表引擎下载失败了，可能是网络抖动或资源加载被中断。刷新页面或稍后重试即可。';
  }

  return fallbackMessage;
};

export const createAsyncChartRuntime = (
  loader: () => Promise<unknown>,
  errorMessage = DEFAULT_ERROR_MESSAGE,
): AsyncChartRuntimeState => {
  const ready = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);
  let pending: Promise<void> | null = null;

  const run = async () => {
    if (ready.value) return;
    if (pending) return pending;

    loading.value = true;
    error.value = null;

    pending = loader()
      .then(() => {
        ready.value = true;
      })
      .catch((runtimeError) => {
        ready.value = false;
        error.value = getChartRuntimeErrorMessage(runtimeError, errorMessage);
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
    ensureReady: run,
    retry,
  };
};
