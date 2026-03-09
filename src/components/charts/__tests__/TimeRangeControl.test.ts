import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import TimeRangeControl from '@/components/charts/TimeRangeControl.vue';

const SegmentedStub = defineComponent({
  name: 'ASegmented',
  props: ['value', 'options'],
  emits: ['change'],
  setup(props, { emit }) {
    return () => h('div', { class: 'segmented-stub' }, [
      h('span', { class: 'segmented-current' }, String(props.value)),
      ...(props.options as Array<{ label: string; value: number }>).map((option) => h(
        'button',
        {
          class: 'segmented-option',
          type: 'button',
          'data-value': String(option.value),
          onClick: () => emit('change', option.value),
        },
        option.label,
      )),
      h(
        'button',
        {
          class: 'segmented-option invalid',
          type: 'button',
          onClick: () => emit('change', 'bad-value'),
        },
        'invalid',
      ),
    ]);
  },
});

describe('TimeRangeControl', () => {
  const mountControl = (value = 12) => mount(TimeRangeControl, {
    props: { value },
    global: {
      stubs: {
        ASegmented: SegmentedStub,
      },
    },
  });

  it('渲染固定预测范围选项，避免 UI 文案或可选范围悄悄漂移', () => {
    const wrapper = mountControl(24);
    const labels = wrapper.findAll('.segmented-option').map((node) => node.text());

    expect(wrapper.text()).toContain('预测范围');
    expect(wrapper.find('.segmented-current').text()).toBe('24');
    expect(labels).toEqual(['6个月', '12个月', '24个月', '36个月', 'invalid']);
  });

  it('点击有效范围时向上发出数字值，而不是字符串', async () => {
    const wrapper = mountControl();

    await wrapper.find('[data-value="24"]').trigger('click');

    expect(wrapper.emitted('change')).toEqual([[24]]);
    expect(typeof wrapper.emitted('change')?.[0]?.[0]).toBe('number');
  });

  it('底层组件若意外吐出非法值，也会显式透传 NaN 供上层兜底，而不是静默保持旧值', async () => {
    const wrapper = mountControl();

    await wrapper.find('.segmented-option.invalid').trigger('click');

    const emitted = wrapper.emitted('change');
    expect(emitted).toHaveLength(1);
    expect(Number.isNaN(emitted?.[0]?.[0] as number)).toBe(true);
  });
});
