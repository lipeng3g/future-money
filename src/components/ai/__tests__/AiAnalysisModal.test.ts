import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage, ChatRecord } from '@/utils/ai';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import AiAnalysisModal from '@/components/ai/AiAnalysisModal.vue';
import { createChatDraftScopeKey } from '@/utils/ai';
import { useFinanceStore } from '@/stores/finance';

const { messageSuccess, messageError, messageInfo, loadAiConfigMock, streamChatMock, exportChatHistoryMock } = vi.hoisted(() => ({
  messageSuccess: vi.fn(),
  messageError: vi.fn(),
  messageInfo: vi.fn(),
  loadAiConfigMock: vi.fn(),
  streamChatMock: vi.fn(),
  exportChatHistoryMock: vi.fn(),
}));

vi.mock('ant-design-vue', async () => {
  const actual = await vi.importActual<typeof import('ant-design-vue')>('ant-design-vue');
  return {
    ...actual,
    message: {
      success: messageSuccess,
      error: messageError,
      info: messageInfo,
    },
  };
});

vi.mock('@/utils/ai', async () => {
  const actual = await vi.importActual<typeof import('@/utils/ai')>('@/utils/ai');
  return {
    ...actual,
    loadAiConfig: loadAiConfigMock,
    streamChat: streamChatMock,
    exportChatHistory: exportChatHistoryMock,
  };
});

const AiConfigModalStub = defineComponent({
  name: 'AiConfigModal',
  props: ['open'],
  template: '<div class="ai-config-modal-stub" />',
});

const ADrawer = defineComponent({
  name: 'ADrawer',
  props: ['open'],
  emits: ['close'],
  template: '<div v-if="open" class="a-drawer"><slot /></div>',
});

const ACheckbox = defineComponent({
  name: 'ACheckbox',
  props: ['value'],
  template: '<label class="a-checkbox"><input type="checkbox" /><span><slot /></span></label>',
});

const ACheckboxGroup = defineComponent({
  name: 'ACheckboxGroup',
  props: ['value', 'disabled'],
  emits: ['update:value'],
  computed: {
    disabledState(): string {
      return this.disabled ? 'yes' : 'no';
    },
  },
  template: '<div class="a-checkbox-group" :data-disabled="disabledState"><slot /></div>',
});

const ATextarea = defineComponent({
  name: 'ATextarea',
  props: ['value', 'disabled', 'placeholder', 'autoSize'],
  emits: ['update:value', 'pressEnter'],
  methods: {
    handleInput(event: Event) {
      const target = event.target as HTMLTextAreaElement | null;
      this.$emit('update:value', target?.value ?? '');
    },
  },
  template: `
    <textarea
      class="a-textarea"
      :value="value"
      :disabled="disabled"
      @input="handleInput"
      @keydown.enter="$emit('pressEnter', $event)"
    />
  `,
});

const AButton = defineComponent({
  name: 'AButton',
  props: ['disabled', 'loading', 'type'],
  emits: ['click'],
  template: '<button class="a-button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
});

const mountModal = async () => {
  const wrapper = mount(AiAnalysisModal, {
    props: { open: true },
    global: {
      stubs: {
        AiConfigModal: AiConfigModalStub,
        ADrawer,
        ACheckbox,
        ACheckboxGroup,
        ATextarea,
        AButton,
      },
    },
  });

  await nextTick();
  await nextTick();
  return wrapper;
};

describe('AiAnalysisModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    messageSuccess.mockReset();
    messageError.mockReset();
    messageInfo.mockReset();
    loadAiConfigMock.mockReset();
    streamChatMock.mockReset();
    exportChatHistoryMock.mockReset();

    const store = useFinanceStore();
    store.setSimulatedToday('2026-03-09');
    store.addAccount({ name: '备用账户', initialBalance: 5000, warningThreshold: 800 });
    store.viewMode = 'multi';
    store.multiAccountSelection = [store.accounts[0].id, store.accounts[1].id];

    loadAiConfigMock.mockReturnValue({
      baseUrl: 'https://example.com/v1',
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
    });
  });

  it('会按账户范围保存并恢复草稿，切换范围后互不串台', async () => {
    const store = useFinanceStore();
    const [accountA, accountB] = store.accounts;
    localStorage.setItem(createChatDraftScopeKey({ accountIds: [accountA.id, accountB.id] }), '多账户草稿');
    localStorage.setItem(createChatDraftScopeKey({ accountIds: [accountA.id] }), '单账户草稿');

    const wrapper = await mountModal();

    const textarea = wrapper.find('textarea.a-textarea');
    expect((textarea.element as HTMLTextAreaElement).value).toBe('多账户草稿');
    expect(wrapper.text()).toContain('当前对话与草稿仅保存到这组账户的分析上下文中');

    store.viewMode = 'single';
    store.multiAccountSelection = [];
    store.currentAccountId = accountA.id;
    await nextTick();
    await nextTick();

    expect((wrapper.find('textarea.a-textarea').element as HTMLTextAreaElement).value).toBe('单账户草稿');

    await wrapper.find('textarea.a-textarea').setValue('新的单账户草稿');
    expect(localStorage.getItem(createChatDraftScopeKey({ accountIds: [accountA.id] }))).toBe('新的单账户草稿');
    expect(localStorage.getItem(createChatDraftScopeKey({ accountIds: [accountA.id, accountB.id] }))).toBe('多账户草稿');
  });

  it('清空对话时会一并清空当前范围草稿', async () => {
    const store = useFinanceStore();
    const scopeKey = createChatDraftScopeKey({ accountIds: [store.accounts[0].id, store.accounts[1].id] });
    localStorage.setItem(scopeKey, '待发送问题');

    const wrapper = await mountModal();
    await wrapper.findAll('button.icon-btn')[1].trigger('click');

    expect(localStorage.getItem(scopeKey)).toBeNull();
    expect((wrapper.find('textarea.a-textarea').element as HTMLTextAreaElement).value).toBe('');
    expect(messageSuccess).toHaveBeenCalledWith('当前账户组合对话与草稿已清空');
  });

  it('流式分析期间会锁定账户范围切换，并在发送后清空当前范围草稿', async () => {
    let releaseStream: (() => void) | null = null;
    streamChatMock.mockImplementation(async function* () {
      yield { type: 'thinking', text: '先看趋势' };
      await new Promise<void>((resolve) => {
        releaseStream = resolve;
      });
      yield { type: 'content', text: '分析完成' };
    });

    const store = useFinanceStore();
    const scopeKey = createChatDraftScopeKey({ accountIds: [store.accounts[0].id, store.accounts[1].id] });
    const wrapper = await mountModal();

    await wrapper.find('textarea.a-textarea').setValue('请分析');
    expect(localStorage.getItem(scopeKey)).toBe('请分析');

    await wrapper.find('button.a-button').trigger('click');
    await nextTick();

    expect(localStorage.getItem(scopeKey)).toBeNull();
    expect(wrapper.find('.a-checkbox-group').attributes('data-disabled')).toBe('yes');
    expect(wrapper.text()).toContain('分析进行中，暂时锁定当前账户范围，避免本次上下文串台');

    releaseStream?.();
    await flushPromises();
    await nextTick();

    expect(wrapper.find('.a-checkbox-group').attributes('data-disabled')).toBe('no');
  });

  it('关闭抽屉时会中止流式请求，并且不写回过期结果', async () => {
    let resolveChunk: (() => void) | null = null;
    let capturedSignal: AbortSignal | undefined;
    streamChatMock.mockImplementation(async function* (_config: unknown, _messages: ChatMessage[], options?: { signal?: AbortSignal }) {
      capturedSignal = options?.signal;
      yield { type: 'thinking', text: '先分析上下文' };
      await new Promise<void>((resolve) => {
        resolveChunk = resolve;
      });
      yield { type: 'content', text: '这段结果不应写回' };
    });

    const wrapper = await mountModal();
    await wrapper.find('textarea.a-textarea').setValue('帮我分析');
    await wrapper.find('button.a-button').trigger('click');
    await nextTick();

    expect(wrapper.text()).toContain('思考中...');
    await wrapper.setProps({ open: false });
    await nextTick();

    expect(capturedSignal?.aborted).toBe(true);

    resolveChunk?.();
    await flushPromises();
    await nextTick();

    expect(wrapper.findAll('.msg-row').length).toBe(0);
    expect(wrapper.text()).not.toContain('这段结果不应写回');
    expect(localStorage.getItem('fm-ai-chat:account-1,account-2') ?? '').not.toContain('这段结果不应写回');
    expect(messageError).not.toHaveBeenCalled();
  });

  it('流式过程中若账户范围变化，会丢弃旧请求结果并切到新 scope', async () => {
    let releaseStream: (() => void) | null = null;
    streamChatMock.mockImplementation(async function* () {
      yield { type: 'thinking', text: '旧上下文分析中' };
      await new Promise<void>((resolve) => {
        releaseStream = resolve;
      });
      yield { type: 'content', text: '旧上下文结果' };
    });

    const store = useFinanceStore();
    const [accountA] = store.accounts;
    const wrapper = await mountModal();

    await wrapper.find('textarea.a-textarea').setValue('先分析多账户');
    await wrapper.find('button.a-button').trigger('click');
    await nextTick();
    expect(wrapper.find('.a-checkbox-group').attributes('data-disabled')).toBe('yes');

    store.viewMode = 'single';
    store.multiAccountSelection = [];
    store.currentAccountId = accountA.id;
    await nextTick();
    await nextTick();

    expect(wrapper.find('.a-checkbox-group').attributes('data-disabled')).toBe('no');
    expect((wrapper.find('textarea.a-textarea').element as HTMLTextAreaElement).value).toBe('');

    releaseStream?.();
    await flushPromises();
    await nextTick();

    expect(wrapper.text()).not.toContain('旧上下文结果');
    expect(messageError).not.toHaveBeenCalled();
  });

  it('没有配置时不会误发请求，而是打开设置弹窗', async () => {
    loadAiConfigMock.mockReturnValue(null);
    const wrapper = await mountModal();

    await wrapper.find('button.preset-item').trigger('click');
    await nextTick();

    expect(streamChatMock).not.toHaveBeenCalled();
    expect(wrapper.find('.ai-config-modal-stub').exists()).toBe(true);
  });

  it('导出对话会带上当前 scope 的消息并给出成功提示', async () => {
    streamChatMock.mockImplementation(async function* () {
      yield { type: 'thinking', text: '先看现金流' };
      yield { type: 'content', text: '这是分析结果' };
    });

    const store = useFinanceStore();
    const scopeAccountIds = [store.accounts[0].id, store.accounts[1].id];

    const wrapper = await mountModal();
    await wrapper.find('textarea.a-textarea').setValue('分析双账户');
    await wrapper.find('button.a-button').trigger('click');
    await flushPromises();
    await nextTick();

    const expectedMessages: ChatRecord[] = [
      { role: 'user', content: '分析双账户' },
      { role: 'assistant', content: '这是分析结果', thinking: '先看现金流' },
    ];

    const exportButton = wrapper.findAll('button.icon-btn').find((node) => node.attributes('title') === '导出对话');
    expect(exportButton?.exists()).toBe(true);
    await exportButton!.trigger('click');

    expect(exportChatHistoryMock).toHaveBeenCalledWith(expectedMessages, { accountIds: scopeAccountIds });
    expect(messageSuccess).toHaveBeenCalledWith('当前账户组合对话已导出');
  });
});
