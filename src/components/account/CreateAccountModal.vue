<template>
  <a-modal
    :open="open"
    title="新建账户"
    ok-text="创建"
    cancel-text="取消"
    @ok="handleOk"
    @cancel="$emit('cancel')"
    destroy-on-close
  >
    <a-form layout="vertical">
      <a-form-item label="账户名称" required>
        <a-input v-model:value="name" placeholder="例如：现金账户 / 基金账户" />
      </a-form-item>
      <a-form-item label="类型/说明">
        <a-input v-model:value="typeLabel" placeholder="例如：活期 / 长期投资（可选）" />
      </a-form-item>
      <a-form-item label="初始可用余额">
        <a-input-number
          v-model:value="initialBalance"
          :min="0"
          :step="100"
          addon-after="元"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item label="预警阈值">
        <a-input-number
          v-model:value="warningThreshold"
          :min="0"
          :step="100"
          addon-after="元"
          style="width: 100%"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  open: boolean;
  defaultWarningThreshold: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'submit', payload: { name: string; typeLabel?: string; initialBalance?: number; warningThreshold?: number }): void;
  (e: 'cancel'): void;
}>();

const name = ref('');
const typeLabel = ref('');
const initialBalance = ref<number | null>(0);
const warningThreshold = ref<number | null>(props.defaultWarningThreshold);

watch(
  () => props.open,
  (open) => {
    if (open) {
      name.value = '';
      typeLabel.value = '';
      initialBalance.value = 0;
      warningThreshold.value = props.defaultWarningThreshold;
    }
  },
);

const handleOk = () => {
  if (!name.value.trim()) {
    return;
  }
  emit('submit', {
    name: name.value,
    typeLabel: typeLabel.value,
    initialBalance: typeof initialBalance.value === 'number' ? initialBalance.value : undefined,
    warningThreshold: typeof warningThreshold.value === 'number' ? warningThreshold.value : undefined,
  });
};
</script>

