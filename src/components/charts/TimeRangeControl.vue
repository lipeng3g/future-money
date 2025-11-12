<template>
  <div class="range-control">
    <label>预测范围</label>
    <a-segmented :value="currentValue" :options="options" @change="handleChange" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ value: number }>();
const emit = defineEmits<{ (e: 'change', value: number): void }>();

const currentValue = computed(() => props.value);

const options = [6, 12, 24, 36].map((months) => ({
  label: `${months}个月`,
  value: months,
}));

const handleChange = (value: number | string) => {
  emit('change', Number(value));
};
</script>

<style scoped>
.range-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.range-control label {
  color: #6b7280;
}
</style>
