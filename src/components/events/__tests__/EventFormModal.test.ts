import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import EventFormModal from '@/components/events/EventFormModal.vue';
import { useFinanceStore } from '@/stores/finance';

const { messageError } = vi.hoisted(() => ({
  messageError: vi.fn(),
}));

vi.mock('ant-design-vue', async () => {
  const actual = await vi.importActual<typeof import('ant-design-vue')>('ant-design-vue');
  return {
    ...actual,
    message: {
      error: messageError,
    },
  };
});

const makeFormItem = () => ({
  name: 'AFormItem',
  props: ['label', 'required', 'validateStatus', 'help'],
  template: `
    <div class="a-form-item" :data-label="label" :data-status="validateStatus || ''">
      <label>{{ label }}</label>
      <slot />
      <div v-if="help" class="a-form-item-help">{{ help }}</div>
    </div>
  `,
});

const makeDatePicker = () => ({
  name: 'ADatePicker',
  props: ['value', 'disabledDate'],
  emits: ['update:value'],
  computed: {
    textValue(): string {
      const current = this.value as { format?: (pattern: string) => string } | null | undefined;
      return current?.format ? current.format('YYYY-MM-DD') : '';
    },
  },
  template: `
    <input
      class="a-date-picker"
      type="date"
      :value="textValue"
      @input="$emit('update:value', $event.target.value ? { format: () => $event.target.value } : null)"
    />
  `,
});

const stubs = {
  AModal: {
    name: 'AModal',
    props: ['open', 'title', 'width', 'destroyOnClose'],
    emits: ['ok', 'cancel'],
    template: '<div v-if="open" class="a-modal"><slot /></div>',
  },
  AForm: {
    name: 'AForm',
    template: '<form class="a-form"><slot /></form>',
  },
  AFormItem: makeFormItem(),
  AInput: {
    name: 'AInput',
    props: ['value', 'placeholder'],
    emits: ['update:value'],
    template: '<input class="a-input" :value="value" :placeholder="placeholder" @input="$emit(\'update:value\', $event.target.value)" />',
  },
  AInputNumber: {
    name: 'AInputNumber',
    props: ['value', 'min', 'max', 'step', 'addonAfter'],
    emits: ['update:value'],
    template: '<input class="a-input-number" type="number" :value="value" @input="$emit(\'update:value\', Number($event.target.value))" />',
  },
  ARadioGroup: {
    name: 'ARadioGroup',
    template: '<div class="a-radio-group"><slot /></div>',
  },
  ARadioButton: {
    name: 'ARadioButton',
    props: ['value'],
    template: '<button type="button" class="a-radio-button"><slot /></button>',
  },
  ASelect: {
    name: 'ASelect',
    props: ['value'],
    emits: ['update:value'],
    methods: {
      normalizeValue(raw: string) {
        return /^\d+$/.test(raw) ? Number(raw) : raw;
      },
    },
    template: '<select class="a-select" :value="value" @change="$emit(\'update:value\', normalizeValue($event.target.value))"><slot /></select>',
  },
  ASelectOption: {
    name: 'ASelectOption',
    props: ['value'],
    template: '<option class="a-select-option" :value="value"><slot /></option>',
  },
  ADatePicker: makeDatePicker(),
  ASwitch: {
    name: 'ASwitch',
    props: ['checked'],
    emits: ['update:checked'],
    template: '<input class="a-switch" type="checkbox" :checked="checked" @change="$emit(\'update:checked\', $event.target.checked)" />',
  },
};

const mountModal = () => mount(EventFormModal, {
  props: {
    open: true,
  },
  global: {
    stubs,
  },
});

const fillValidBaseFields = async (wrapper: ReturnType<typeof mountModal>) => {
  await setTextField(wrapper, '名称', '测试事件');
  await setNumberField(wrapper, '金额', 1000);
};

const findFormItem = (wrapper: ReturnType<typeof mountModal>, label: string) =>
  wrapper.find(`.a-form-item[data-label="${label}"]`);

const setDateField = async (wrapper: ReturnType<typeof mountModal>, label: string, value: string) => {
  const input = findFormItem(wrapper, label).find('input[type="date"]');
  await input.setValue(value);
  await nextTick();
};

const setNumberField = async (wrapper: ReturnType<typeof mountModal>, label: string, value: number) => {
  const input = findFormItem(wrapper, label).find('input[type="number"]');
  await input.setValue(String(value));
  await nextTick();
};

const setTextField = async (wrapper: ReturnType<typeof mountModal>, label: string, value: string) => {
  const input = findFormItem(wrapper, label).find('input[type="text"], input:not([type])');
  await input.setValue(value);
  await nextTick();
};

const getSchedulePreviewDates = (wrapper: ReturnType<typeof mountModal>) =>
  wrapper.findAll('.schedule-preview li span').map((node) => node.text());

describe('EventFormModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    messageError.mockReset();
    const store = useFinanceStore();
    store.setSimulatedToday('2026-03-09');
  });

  it('会随频率切换显示对应字段，并用业务 today 填充一次性默认日期', async () => {
    const wrapper = mountModal();
    await fillValidBaseFields(wrapper);

    expect(findFormItem(wrapper, '每月日期 (1-31)').exists()).toBe(true);
    expect(findFormItem(wrapper, '发生日期').exists()).toBe(false);
    expect(getSchedulePreviewDates(wrapper)).toEqual(['2026-04-01', '2026-05-01', '2026-06-01']);

    await wrapper.find('select.a-select').setValue('once');
    await nextTick();

    const onceDateInput = findFormItem(wrapper, '发生日期').find('input[type="date"]');
    expect(onceDateInput.exists()).toBe(true);
    expect((onceDateInput.element as HTMLInputElement).value).toBe('2026-03-09');
    expect(findFormItem(wrapper, '每月日期 (1-31)').exists()).toBe(false);

    await wrapper.find('select.a-select').setValue('yearly');
    await nextTick();

    expect(findFormItem(wrapper, '月份').exists()).toBe(true);
    expect(findFormItem(wrapper, '日期').exists()).toBe(true);
    expect(findFormItem(wrapper, '发生日期').exists()).toBe(false);
  });

  it('会在字段旁即时展示起止日期与一次性日期的错误提示', async () => {
    const wrapper = mountModal();
    await fillValidBaseFields(wrapper);

    await setDateField(wrapper, '起始日期', '2026-03-12');
    await setDateField(wrapper, '结束日期', '2026-03-10');

    expect(findFormItem(wrapper, '起始日期').attributes('data-status')).toBe('error');
    expect(findFormItem(wrapper, '起始日期').text()).toContain('起始日期不能晚于结束日期。');
    expect(findFormItem(wrapper, '结束日期').attributes('data-status')).toBe('error');
    expect(findFormItem(wrapper, '结束日期').text()).toContain('结束日期不能早于起始日期。');

    await wrapper.find('select.a-select').setValue('once');
    await nextTick();
    await setDateField(wrapper, '起始日期', '2026-03-10');
    await setDateField(wrapper, '结束日期', '2026-03-20');
    await setDateField(wrapper, '发生日期', '2026-03-25');

    expect(findFormItem(wrapper, '发生日期').attributes('data-status')).toBe('error');
    expect(findFormItem(wrapper, '发生日期').text()).toContain('发生日期不能晚于结束日期。');
  });

  it('会在 yearly/monthly 规则下切换预演与即时语义提示', async () => {
    const wrapper = mountModal();
    await fillValidBaseFields(wrapper);

    await setNumberField(wrapper, '每月日期 (1-31)', 31);
    expect(findFormItem(wrapper, '每月日期 (1-31)').text()).toContain('遇到没有 31 日的月份时，会自动落在当月最后一天。');
    expect(getSchedulePreviewDates(wrapper)).toContain('2026-04-30');

    await wrapper.find('select.a-select').setValue('yearly');
    await nextTick();

    const selects = wrapper.findAll('select.a-select');
    await selects[1].setValue('4');
    await nextTick();
    await setNumberField(wrapper, '日期', 31);

    expect(findFormItem(wrapper, '日期').attributes('data-status')).toBe('error');
    expect(findFormItem(wrapper, '日期').text()).toContain('4 月没有 31 日，请调整为该月存在的日期。');
    expect(wrapper.text()).not.toContain('接下来会这样发生');
  });

  it('提交非法规则时仍会阻止提交并走全局错误提示', async () => {
    const wrapper = mountModal();
    await fillValidBaseFields(wrapper);

    await setTextField(wrapper, '名称', '年度测试');
    await wrapper.find('select.a-select').setValue('yearly');
    await nextTick();
    const selects = wrapper.findAll('select.a-select');
    await selects[1].setValue('4');
    await nextTick();
    await setNumberField(wrapper, '日期', 31);

    await wrapper.vm.$.setupState.handleSubmit();

    expect(messageError).toHaveBeenCalledWith('每年事件的月份和日期组合无效');
    expect(wrapper.emitted('submit')).toBeUndefined();
  });
});
