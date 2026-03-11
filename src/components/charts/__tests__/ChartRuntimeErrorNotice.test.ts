import { describe, expect, it } from 'vitest';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import ChartRuntimeErrorNotice from '@/components/charts/ChartRuntimeErrorNotice.vue';

// unit-test stub for ant-design-vue button
const AButtonStub = defineComponent({
  name: 'AButton',
  props: {
    size: String,
  },
  template: '<button class="a-button"><slot /></button>',
});

describe('ChartRuntimeErrorNotice', () => {
  it('renders message and action when provided', () => {
    const wrapper = mount(ChartRuntimeErrorNotice, {
      props: {
        message: '图表引擎下载失败了',
        action: '建议刷新页面重试',
      },
      global: {
        components: {
          'a-button': AButtonStub,
        },
      },
    });

    expect(wrapper.text()).toContain('图表加载失败');
    expect(wrapper.text()).toContain('图表引擎下载失败了');
    expect(wrapper.text()).toContain('建议刷新页面重试');
    expect(wrapper.text()).toContain('重试');
    expect(wrapper.text()).toContain('收起');
  });

  it('falls back to default message', () => {
    const wrapper = mount(ChartRuntimeErrorNotice, {
      props: {
        message: null,
      },
      global: {
        components: {
          'a-button': AButtonStub,
        },
      },
    });

    expect(wrapper.text()).toContain('图表引擎加载失败，请稍后重试。');
  });
});
