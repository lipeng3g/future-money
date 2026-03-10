import { onMounted } from 'vue';
import { getSharedChartRuntime } from '@/utils/chart-runtime-preload';

export const useChartRuntime = (
  key: string,
  loader: () => Promise<unknown>,
  errorMessage?: string,
) => {
  const runtime = getSharedChartRuntime(key, loader, errorMessage);

  onMounted(() => {
    void runtime.ensureReady();
  });

  return runtime;
};
