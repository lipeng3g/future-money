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
      <a-form-item label="预警阈值">
        <a-input-number
          v-model:value="warningThreshold"
          :min="0"
          :step="100"
          addon-after="元"
          style="width: 100%"
        />
      </a-form-item>
      <p class="create-hint">创建后请进行首次对账，设定账户的当前余额。</p>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue';
import { ref, watch } from 'vue';

interface Props {
  open: boolean;
  defaultWarningThreshold: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'submit', payload: { name: string; typeLabel?: string; warningThreshold?: number }): void;
  (e: 'cancel'): void;
}>();

const name = ref('');
const typeLabel = ref('');
const warningThreshold = ref<number | null>(props.defaultWarningThreshold);

watch(
  () => props.open,
  (open) => {
    if (open) {
      name.value = '';
      typeLabel.value = '';
      warningThreshold.value = props.defaultWarningThreshold;
    }
  },
);

const handleOk = () => {
  const trimmedName = name.value.trim();
  if (!trimmedName) {
    message.error('账户名称不能为空');
    return;
  }
  emit('submit', {
    name: trimmedName,
    typeLabel: typeLabel.value.trim() || undefined,
    warningThreshold: typeof warningThreshold.value === 'number' ? warningThreshold.value : undefined,
  });
};
</script>

<style scoped>
.create-hint {
  margin: 0;
  padding: 8px 12px;
  background: #f0f9ff;
  border-radius: 6px;
  color: #0369a1;
  font-size: 0.8rem;
}
</style>
