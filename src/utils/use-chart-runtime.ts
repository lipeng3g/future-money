import { onMounted } from 'vue';
import { createAsyncChartRuntime } from '@/utils/chart-runtime';

export const useChartRuntime = (
  loader: () => Promise<unknown>,
  errorMessage?: string,
) => {
  const runtime = createAsyncChartRuntime(loader, errorMessage);

  onMounted(() => {
    void runtime.ensureReady();
  });

  return runtime;
};
