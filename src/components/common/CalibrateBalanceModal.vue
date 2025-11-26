<template>
  <a-modal
    :open="open"
    title="校准当前账户余额"
    ok-text="校准"
    cancel-text="取消"
    @ok="handleOk"
    @cancel="$emit('cancel')"
    destroy-on-close
  >
    <a-form layout="vertical">
      <a-form-item label="校准日期" required>
        <a-date-picker v-model:value="localDate" style="width: 100%" />
      </a-form-item>
      <a-form-item label="当前真实余额" required>
        <a-input-number
          v-model:value="localBalance"
          :min="0"
          :step="100"
          addon-after="元"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item label="备注">
        <a-input
          v-model:value="localNote"
          placeholder="例如：工资到账后、还完信用卡等"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import dayjs, { Dayjs } from 'dayjs';
import { ref, watch } from 'vue';

interface Props {
  open: boolean;
  defaultDate: string;
  defaultBalance: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'submit', payload: { date: string; balance: number; note?: string }): void;
  (e: 'cancel'): void;
}>();

const localDate = ref<Dayjs | null>(dayjs(props.defaultDate));
const localBalance = ref<number | null>(props.defaultBalance);
const localNote = ref<string>('');

watch(
  () => props.open,
  (open) => {
    if (open) {
      localDate.value = dayjs(props.defaultDate);
      localBalance.value = props.defaultBalance;
      localNote.value = '';
    }
  },
);

const handleOk = () => {
  if (!localDate.value || typeof localBalance.value !== 'number') {
    return;
  }
  emit('submit', {
    date: localDate.value.format('YYYY-MM-DD'),
    balance: localBalance.value,
    note: localNote.value?.trim() || undefined,
  });
};
</script>
