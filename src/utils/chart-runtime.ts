import { ref } from 'vue';

export interface AsyncChartRuntimeState {
  ready: Readonly<ReturnType<typeof ref<boolean>>>;
  loading: Readonly<ReturnType<typeof ref<boolean>>>;
  error: Readonly<ReturnType<typeof ref<string | null>>>;
  ensureReady: () => Promise<void>;
  retry: () => Promise<void>;
}

export const createAsyncChartRuntime = (
  loader: () => Promise<unknown>,
  errorMessage = '图表引擎加载失败，请稍后重试。',
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
      .catch(() => {
        ready.value = false;
        error.value = errorMessage;
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
