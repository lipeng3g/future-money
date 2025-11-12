<template>
  <a-modal
    :open="open"
    :title="title"
    width="720px"
    destroy-on-close
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form layout="vertical">
      <div class="form-grid">
        <a-form-item label="名称" required>
          <a-input v-model:value="formState.name" placeholder="例如：工资 / 房贷" />
        </a-form-item>
        <a-form-item label="金额" required>
          <a-input-number v-model:value="formState.amount" :min="0" :step="100" addon-after="元" style="width: 100%" />
        </a-form-item>
        <a-form-item label="方向" required>
          <a-radio-group v-model:value="formState.category">
            <a-radio-button value="income">收入</a-radio-button>
            <a-radio-button value="expense">支出</a-radio-button>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="频率" required>
          <a-select v-model:value="formState.type">
            <a-select-option value="once">一次性</a-select-option>
            <a-select-option value="monthly">每月</a-select-option>
            <a-select-option value="yearly">每年</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="起始日期" required>
          <a-date-picker v-model:value="startDateValue" style="width: 100%" />
        </a-form-item>
        <a-form-item label="结束日期">
          <a-date-picker v-model:value="endDateValue" style="width: 100%" />
        </a-form-item>
      </div>

      <template v-if="formState.type === 'once'">
        <a-form-item label="发生日期" required>
          <a-date-picker v-model:value="onceDateValue" style="width: 100%" />
        </a-form-item>
      </template>

      <template v-else-if="formState.type === 'monthly'">
        <a-form-item label="每月日期 (1-31)" required>
          <a-input-number v-model:value="formState.monthlyDay" :min="1" :max="31" />
        </a-form-item>
      </template>

      <template v-else>
        <div class="form-grid">
          <a-form-item label="月份" required>
            <a-select v-model:value="formState.yearlyMonth">
              <a-select-option v-for="month in 12" :key="month" :value="month">
                {{ month }} 月
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="日期" required>
            <a-input-number v-model:value="formState.yearlyDay" :min="1" :max="31" />
          </a-form-item>
        </div>
      </template>

      <div class="form-grid">
        <a-form-item label="备注">
          <a-input v-model:value="formState.notes" placeholder="例如：税后到账" />
        </a-form-item>
        <a-form-item label="颜色">
          <input type="color" v-model="formState.color" class="color-picker" />
        </a-form-item>
        <a-form-item label="是否启用">
          <a-switch v-model:checked="formState.enabled" />
        </a-form-item>
      </div>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import dayjs, { Dayjs } from 'dayjs';
import { computed, reactive, watch } from 'vue';
import type { CashFlowEvent, EventFormValues } from '@/types/event';

interface Props {
  open: boolean;
  event?: CashFlowEvent | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{ (e: 'submit', payload: EventFormValues): void; (e: 'cancel'): void }>();

interface FormState {
  name: string;
  amount: number;
  category: EventFormValues['category'];
  type: EventFormValues['type'];
  startDate: string;
  endDate?: string;
  onceDate?: string;
  monthlyDay?: number;
  yearlyMonth?: number;
  yearlyDay?: number;
  notes?: string;
  color?: string;
  enabled: boolean;
}

const defaultFormState = (): FormState => ({
  name: '',
  amount: 0,
  category: 'income',
  type: 'monthly',
  startDate: dayjs().format('YYYY-MM-DD'),
  endDate: undefined,
  onceDate: dayjs().format('YYYY-MM-DD'), // 默认今天
  monthlyDay: 1, // 默认每月1号
  yearlyMonth: 1, // 默认1月
  yearlyDay: 1, // 默认1号
  notes: '',
  color: undefined,
  enabled: true,
});

const formState = reactive<FormState>(defaultFormState());

const startDateValue = computed<Dayjs | null>({
  get: () => (formState.startDate ? dayjs(formState.startDate) : null),
  set: (value) => {
    formState.startDate = value ? value.format('YYYY-MM-DD') : '';
  },
});

const endDateValue = computed<Dayjs | null>({
  get: () => (formState.endDate ? dayjs(formState.endDate) : null),
  set: (value) => {
    formState.endDate = value ? value.format('YYYY-MM-DD') : undefined;
  },
});

const onceDateValue = computed<Dayjs | null>({
  get: () => (formState.onceDate ? dayjs(formState.onceDate) : null),
  set: (value) => {
    formState.onceDate = value ? value.format('YYYY-MM-DD') : undefined;
  },
});

const title = computed(() => (props.event ? '编辑现金流事件' : '添加现金流事件'));

const fillForm = (source?: CashFlowEvent | null) => {
  if (!source) {
    Object.assign(formState, defaultFormState());
    return;
  }
  Object.assign(formState, {
    name: source.name,
    amount: source.amount,
    category: source.category,
    type: source.type,
    startDate: source.startDate,
    endDate: source.endDate,
    onceDate: source.onceDate,
    monthlyDay: source.monthlyDay,
    yearlyMonth: source.yearlyMonth,
    yearlyDay: source.yearlyDay,
    notes: source.notes,
    color: source.color,
    enabled: source.enabled,
  });
};

watch(
  () => props.event,
  (value) => {
    fillForm(value ?? null);
  },
  { immediate: true },
);

watch(
  () => props.open,
  (open) => {
    if (!open) {
      fillForm(props.event ?? null);
    }
  },
);

// 监听频率类型变化，自动设置合理的默认值
watch(
  () => formState.type,
  (newType) => {
    if (newType === 'once' && !formState.onceDate) {
      formState.onceDate = dayjs().format('YYYY-MM-DD');
    } else if (newType === 'monthly' && !formState.monthlyDay) {
      formState.monthlyDay = 1;
    } else if (newType === 'yearly') {
      if (!formState.yearlyMonth) formState.yearlyMonth = 1;
      if (!formState.yearlyDay) formState.yearlyDay = 1;
    }
  },
);

const normalizeDate = (value?: string | Dayjs | null): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return value.format('YYYY-MM-DD');
};

const handleSubmit = () => {
  const payload: EventFormValues = {
    name: formState.name,
    amount: formState.amount,
    category: formState.category,
    type: formState.type,
    startDate: normalizeDate(formState.startDate) ?? dayjs().format('YYYY-MM-DD'),
    endDate: normalizeDate(formState.endDate),
    onceDate: normalizeDate(formState.onceDate),
    monthlyDay: formState.monthlyDay,
    yearlyMonth: formState.yearlyMonth,
    yearlyDay: formState.yearlyDay,
    notes: formState.notes,
    color: formState.color,
    enabled: formState.enabled,
  };
  emit('submit', payload);
};

const handleCancel = () => emit('cancel');
</script>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.color-picker {
  width: 100%;
  height: 40px;
  border: 1px solid rgba(15, 23, 42, 0.2);
  border-radius: 8px;
}
</style>
