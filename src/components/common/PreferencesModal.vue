<template>
  <a-modal :open="open" title="偏好设置" @ok="handleOk" @cancel="$emit('cancel')" destroy-on-close>
    <a-form layout="vertical">
      <a-form-item label="默认预测范围">
        <a-select v-model:value="local.defaultViewMonths">
          <a-select-option v-for="months in [6, 12, 24, 36]" :key="months" :value="months">
            {{ months }} 个月
          </a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item label="图表风格">
        <a-radio-group v-model:value="local.chartType">
          <a-radio value="line">折线</a-radio>
          <a-radio value="area">面积</a-radio>
        </a-radio-group>
      </a-form-item>
      <a-form-item label="标记周末">
        <a-switch v-model:checked="local.showWeekends" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { UserPreferences } from '@/types/account';

interface Props {
  open: boolean;
  preferences: UserPreferences;
}

const props = defineProps<Props>();
const emit = defineEmits<{ (e: 'save', payload: UserPreferences): void; (e: 'cancel'): void }>();

const local = reactive<UserPreferences>({ ...props.preferences });

watch(
  () => props.preferences,
  (value) => {
    Object.assign(local, value);
  },
  { deep: true },
);

const handleOk = () => {
  emit('save', { ...local });
};
</script>
