<template>
  <div class="chart-runtime-error" role="alert">
    <strong>图表加载失败</strong>
    <p>{{ message ?? '图表引擎加载失败，请稍后重试。' }}</p>
    <small v-if="action" class="chart-runtime-error-action">{{ action }}</small>
    <div class="chart-runtime-error-actions">
      <a-button size="small" @click="$emit('retry')">重试</a-button>
      <a-button size="small" @click="$emit('dismiss')">收起</a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message?: string | null;
  action?: string | null;
}>();

defineEmits<{
  retry: [];
  dismiss: [];
}>();
</script>

<style scoped>
.chart-runtime-error {
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
  border-radius: 8px;
  padding: 12px;
  background: rgba(255, 77, 79, 0.06);
}

.chart-runtime-error strong {
  display: block;
  margin-bottom: 4px;
}

.chart-runtime-error p {
  margin: 0;
}

.chart-runtime-error-action {
  display: block;
  margin-top: 6px;
  opacity: 0.8;
}

.chart-runtime-error-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
</style>
