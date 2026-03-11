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
  border: 1px dashed rgba(239, 68, 68, 0.28);
  border-radius: 14px;
  padding: 24px;
  background: rgba(254, 242, 242, 0.9);
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
  color: #991b1b;
}

.chart-runtime-error strong {
  font-size: 1rem;
}

.chart-runtime-error p {
  margin: 0;
  max-width: 360px;
  line-height: 1.6;
  font-size: 0.88rem;
}

.chart-runtime-error-action {
  max-width: 360px;
  line-height: 1.6;
  color: rgba(127, 29, 29, 0.9);
  font-size: 0.78rem;
}

.chart-runtime-error-actions {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}
</style>
