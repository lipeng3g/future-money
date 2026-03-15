import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiRequestError, type ChatMessage } from '@/utils/ai';
import type { ChatRecord } from '@/utils/ai-storage';
import { createChatDraftScopeKey } from '@/utils/ai-storage';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import AiAnalysisModal from '@/components/ai/AiAnalysisModal.vue';
import { useFinanceStore } from '@/stores/finance';

const { messageSuccess, messageError, messageInfo, messageWarning, loadAiConfigMock, streamChatWithRecoveryMock, exportChatHistoryMock } = vi.hoisted(() => ({
  messageSuccess: vi.fn(),
  messageError: vi.fn(),
  messageInfo: vi.fn(),
  messageWarning: vi.fn(),
  loadAiConfigMock: vi.fn(),
  streamChatWithRecoveryMock: vi.fn(),
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
      warning: messageWarning,
    },
  };
});

vi.mock('@/utils/ai', async () => {
  const actual = await vi.importActual<typeof import('@/utils/ai')>('@/utils/ai');
  return {
    ...actual,
    streamChatWithRecovery: streamChatWithRecoveryMock,
  };
});

vi.mock('@/utils/ai-config', async () => {
  const actual = await vi.importActual<typeof import('@/utils/ai-config')>('@/utils/ai-config');
  return {
    ...actual,
    loadAiConfig: loadAiConfigMock,
  };
});

vi.mock('@/utils/ai-storage', async () => {
  const actual = await vi.importActual<typeof import('@/utils/ai-storage')>('@/utils/ai-storage');
  return {
    ...actual,
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
    streamChatWithRecoveryMock.mockReset();
    exportChatHistoryMock.mockReset();
    messageWarning.mockReset();

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
    expect(localStorage.getItem(createChatDraftScopeKey({ accountIds: [accountA.id] }))).toBe('单账户草稿');

    await wrapper.find('textarea.a-textarea').setValue('新的单账户草稿');
    expect(localStorage.getItem(createChatDraftScopeKey({ accountIds: [accountA.id] }))).toBe('新的单账户草稿');
    expect(localStorage.getItem(createChatDraftScopeKey({ accountIds: [accountA.id, accountB.id] }))).toBe('多账户草稿');
  });

  it('清空对话时会一并清空当前范围草稿，并回到空状态提示', async () => {
    const store = useFinanceStore();
    const scopeKey = createChatDraftScopeKey({ accountIds: [store.accounts[0].id, store.accounts[1].id] });
    localStorage.setItem(scopeKey, '待发送问题');

    const wrapper = await mountModal();
    await wrapper.findAll('button.icon-btn')[1].trigger('click');

    expect(localStorage.getItem(scopeKey)).toBeNull();
    expect((wrapper.find('textarea.a-textarea').element as HTMLTextAreaElement).value).toBe('');
    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('有什么可以帮你分析的？');
    expect(wrapper.find('.quick-row').exists()).toBe(false);
    expect(messageSuccess).toHaveBeenCalledWith('当前账户组合对话与草稿已清空');
  });

  it('流式分析期间会锁定账户范围切换，并在发送后清空当前范围草稿', async () => {
    let releaseStream: (() => void) | null = null;
    streamChatWithRecoveryMock.mockImplementation(async function* () {
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
    streamChatWithRecoveryMock.mockImplementation(async function* (_config: unknown, _messages: ChatMessage[], options?: { signal?: AbortSignal }) {
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

  it('请求失败时会保留已提交问题、展示内联错误，并允许一键重试而不污染历史', async () => {
    streamChatWithRecoveryMock
      .mockImplementationOnce(async function* () {
        throw new Error('网络异常');
      })
      .mockImplementationOnce(async function* (_config: unknown, messages: ChatMessage[]) {
        expect(messages).not.toEqual(expect.arrayContaining([
          expect.objectContaining({ role: 'assistant', content: expect.stringContaining('请求失败') }),
        ]));
        yield { type: 'content', text: '重试后恢复成功' };
      });

    const wrapper = await mountModal();
    await wrapper.find('textarea.a-textarea').setValue('分析失败恢复');
    await wrapper.find('button.a-button').trigger('click');
    await flushPromises();
    await nextTick();

    expect(messageError).toHaveBeenCalledWith('请求失败: 网络异常');
    expect(wrapper.text()).toContain('请求失败: 网络异常');
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.findAll('.msg-row')).toHaveLength(1);
    expect(wrapper.findAll('.msg-row')[0]?.text()).toContain('分析失败恢复');
    expect(wrapper.text()).not.toContain('请求失败: 网络异常请求失败: 网络异常');
    expect(localStorage.getItem('fm-ai-chat:account-1,account-2') ?? '').not.toContain('请求失败: 网络异常');

    const retryButton = wrapper.findAll('button.request-retry-btn').find((node) => node.text() === '直接重试');
    expect(retryButton?.exists()).toBe(true);
    await retryButton!.trigger('click');
    await flushPromises();
    await nextTick();

    expect(streamChatWithRecoveryMock).toHaveBeenCalledTimes(2);
    expect(wrapper.findAll('.msg-row')).toHaveLength(2);
    expect(wrapper.findAll('.msg-row')[1]?.text()).toContain('重试后恢复成功');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    const store = useFinanceStore();
    const historyKey = `fm-ai-chat:${[store.accounts[0].id, store.accounts[1].id].sort().join(',')}`;
    expect(localStorage.getItem(historyKey) ?? '').toContain('重试后恢复成功');
  });

  it('empty_stream 首包前断开时会展示可恢复提示，并记录 provider/model/trace 元信息', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    streamChatWithRecoveryMock.mockRejectedValueOnce(new AiRequestError('API 请求失败 (500): 上游流式连接在返回首包前断开，请重试', {
      status: 500,
      provider: 'api.deepseek.com',
      model: 'deepseek-chat',
      traceId: 'trace-empty-stream',
      code: 'empty_stream',
      type: 'server_error',
      retryable: true,
    }));

    const wrapper = await mountModal();
    await wrapper.find('textarea.a-textarea').setValue('分析 empty stream');
    await wrapper.find('button.a-button').trigger('click');
    await flushPromises();
    await nextTick();

    expect(wrapper.find('[role="alert"]').text()).toContain('分析未完成，但可以恢复');
    expect(wrapper.find('[role="alert"]').text()).toContain('请求失败: API 请求失败 (500): 上游流式连接在返回首包前断开，请重试');
    expect(wrapper.find('[role="alert"]').text()).toContain('provider: api.deepseek.com');
    expect(wrapper.find('[role="alert"]').text()).toContain('model: deepseek-chat');
    expect(wrapper.find('[role="alert"]').text()).toContain('trace: trace-empty-stream');
    expect(errorSpy).toHaveBeenCalledWith('[ai-analysis] request failed', expect.objectContaining({
      provider: 'api.deepseek.com',
      model: 'deepseek-chat',
      traceId: 'trace-empty-stream',
      code: 'empty_stream',
    }));
  });

  it('empty_stream 自动重试后成功时，用户不会看到重复输出，且不会额外打断用户', async () => {
    streamChatWithRecoveryMock.mockResolvedValueOnce({
      content: '自动重试后恢复成功',
      thinking: undefined,
      retries: 1,
      downgraded: false,
      diagnostics: {
        provider: 'cli-proxy-api-latest-katr.onrender.com',
        model: 'gpt-5.4',
        traceId: 'trace-retry-success',
        retries: 1,
        retryable: false,
      },
    });

    const wrapper = await mountModal();
    await wrapper.find('textarea.a-textarea').setValue('分析自动重试成功');
    await wrapper.find('button.a-button').trigger('click');
    await flushPromises();
    await nextTick();

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    const rows = wrapper.findAll('.msg-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.text()).toContain('分析自动重试成功');
    expect(rows[1]?.text()).toContain('自动重试后恢复成功');
    expect(wrapper.text()).not.toContain('正在分析...');
    expect(messageWarning).not.toHaveBeenCalled();
  });

  it('empty_stream 自动重试耗尽后仍失败时，会展示可复制诊断与可恢复提示', async () => {
    streamChatWithRecoveryMock.mockRejectedValueOnce(new AiRequestError('API 请求失败 (500): 上游流式连接在返回首包前断开，请重试', {
      status: 500,
      provider: 'cli-proxy-api-latest-katr.onrender.com',
      model: 'gpt-5.4',
      traceId: 'trace-retries-exhausted',
      code: 'empty_stream',
      type: 'server_error',
      retryable: true,
      retries: 2,
      downgradedFromModel: 'gpt-5.4',
      downgradedToModel: 'gpt-5.2',
      downgradeStrategy: 'model-fallback',
    }));

    const wrapper = await mountModal();
    await wrapper.find('textarea.a-textarea').setValue('分析重试耗尽');
    await wrapper.find('button.a-button').trigger('click');
    await flushPromises();
    await nextTick();

    const alert = wrapper.find('[role="alert"]');
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain('分析未完成，但可以恢复');
    expect(alert.text()).toContain('provider: cli-proxy-api-latest-katr.onrender.com');
    expect(alert.text()).toContain('model: gpt-5.4');
    expect(alert.text()).toContain('trace: trace-retries-exhausted');
    expect(alert.text()).toContain('http: 500');
    expect(alert.text()).toContain('retries: 2');
    expect(alert.text()).toContain('已降级模型重试: gpt-5.4 → gpt-5.2');
    expect(alert.text()).toContain('诊断：provider=cli-proxy-api-latest-katr.onrender.com | model=gpt-5.4 | traceId=trace-retries-exhausted | httpStatus=500 | retries=2');

    const rows = wrapper.findAll('.msg-row');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.text()).toContain('分析重试耗尽');
    expect(wrapper.text()).not.toContain('正在分析...');
  });

  it('首包超时等可恢复错误时不会把请求当成成功完成，也不会留下空白 assistant 消息', async () => {
    streamChatWithRecoveryMock.mockImplementationOnce(async function* () {
      throw new AiRequestError('已发出请求，但长时间未收到首包响应，请稍后重试', {
        provider: 'api.openai.com',
        model: 'gpt-4o-mini',
        code: 'AI_FIRST_PAYLOAD_TIMEOUT',
        retryable: true,
      });
    });

    const wrapper = await mountModal();
    await wrapper.find('textarea.a-textarea').setValue('看看是否超时');
    await wrapper.find('button.a-button').trigger('click');
    await flushPromises();
    await nextTick();

    const rows = wrapper.findAll('.msg-row');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.text()).toContain('看看是否超时');
    expect(wrapper.text()).not.toContain('正在分析...');
    expect(wrapper.text()).toContain('请求失败: 已发出请求，但长时间未收到首包响应，请稍后重试');
    expect(wrapper.find('[role="alert"]').text()).toContain('provider: api.openai.com');
    expect(wrapper.find('[role="alert"]').text()).toContain('model: gpt-4o-mini');
  });

  it('请求失败后可以把上次问题恢复到输入框继续编辑，并清掉错误横幅', async () => {
    streamChatWithRecoveryMock.mockImplementationOnce(async function* () {
      throw new Error('网络异常');
    });

    const store = useFinanceStore();
    const scopeKey = createChatDraftScopeKey({ accountIds: [store.accounts[0].id, store.accounts[1].id] });
    const wrapper = await mountModal();

    await wrapper.find('textarea.a-textarea').setValue('原问题');
    await wrapper.find('button.a-button').trigger('click');
    await flushPromises();
    await nextTick();

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect((wrapper.find('textarea.a-textarea').element as HTMLTextAreaElement).value).toBe('');
    expect(localStorage.getItem(scopeKey)).toBeNull();

    const restoreButton = wrapper.findAll('button.request-retry-btn').find((node) => node.text() === '继续编辑上次问题');
    expect(restoreButton?.exists()).toBe(true);
    await restoreButton!.trigger('click');
    await nextTick();

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect((wrapper.find('textarea.a-textarea').element as HTMLTextAreaElement).value).toBe('原问题');
    expect(localStorage.getItem(scopeKey)).toBe('原问题');
  });

  it('流式中途失败时会保留已有 thinking 和 partial content，避免用户丢失已生成内容', async () => {
    streamChatWithRecoveryMock
      .mockImplementationOnce(async function* () {
        yield { type: 'thinking', text: '先梳理现金流风险' };
        yield { type: 'content', text: '已经确认下月中旬可能出现缺口。' };
        throw new Error('上游超时');
      })
      .mockImplementationOnce(async function* (_config: unknown, messages: ChatMessage[]) {
        expect(messages).not.toEqual(expect.arrayContaining([
          expect.objectContaining({ role: 'assistant', content: '已经确认下月中旬可能出现缺口。' }),
        ]));
        expect(messages).toEqual(expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: '看看最近风险' }),
        ]));
        yield { type: 'content', text: '重试后的完整建议' };
      });

    const store = useFinanceStore();
    const historyKey = `fm-ai-chat:${[store.accounts[0].id, store.accounts[1].id].sort().join(',')}`;
    const wrapper = await mountModal();

    await wrapper.find('textarea.a-textarea').setValue('看看最近风险');
    await wrapper.find('button.a-button').trigger('click');
    await flushPromises();
    await nextTick();

    const rows = wrapper.findAll('.msg-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.text()).toContain('看看最近风险');
    expect(rows[1]?.text()).toContain('已经确认下月中旬可能出现缺口。');
    expect(rows[1]?.text()).toContain('先梳理现金流风险');
    expect(wrapper.find('[role="alert"]').text()).toContain('请求失败: 上游超时');
    expect(localStorage.getItem(historyKey) ?? '').toContain('已经确认下月中旬可能出现缺口。');
    expect(localStorage.getItem(historyKey) ?? '').toContain('先梳理现金流风险');

    await wrapper.findAll('button.request-retry-btn').find((node) => node.text() === '直接重试')!.trigger('click');
    await flushPromises();
    await nextTick();

    const rowsAfterRetry = wrapper.findAll('.msg-row');
    expect(rowsAfterRetry).toHaveLength(2);
    expect(rowsAfterRetry[1]?.text()).toContain('重试后的完整建议');
    expect(wrapper.text()).not.toContain('已经确认下月中旬可能出现缺口。');
    const savedHistory = localStorage.getItem(historyKey) ?? '';
    expect(savedHistory).toContain('重试后的完整建议');
    expect(savedHistory).not.toContain('已经确认下月中旬可能出现缺口。');
  });

  it('失败后切换 scope 时会清掉旧错误条并加载新 scope 历史', async () => {
    streamChatWithRecoveryMock.mockImplementationOnce(async function* () {
      throw new Error('临时故障');
    });

    const store = useFinanceStore();
    const [accountA] = store.accounts;
    localStorage.setItem(`fm-ai-chat:${accountA.id}`, JSON.stringify([
      { role: 'user', content: '单账户历史问题' },
      { role: 'assistant', content: '单账户历史回答' },
    ] satisfies ChatRecord[]));

    const wrapper = await mountModal();
    await wrapper.find('textarea.a-textarea').setValue('会失败的问题');
    await wrapper.find('button.a-button').trigger('click');
    await flushPromises();
    await nextTick();

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);

    store.viewMode = 'single';
    store.multiAccountSelection = [];
    store.currentAccountId = accountA.id;
    await nextTick();
    await nextTick();

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('单账户历史问题');
    expect(wrapper.text()).toContain('单账户历史回答');
    expect(wrapper.text()).not.toContain('请求失败: 临时故障');
  });

  it('流式过程中若账户范围变化，会丢弃旧请求结果并切到新 scope', async () => {
    let releaseStream: (() => void) | null = null;
    streamChatWithRecoveryMock.mockImplementation(async function* () {
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

    expect(streamChatWithRecoveryMock).not.toHaveBeenCalled();
    expect(wrapper.find('.ai-config-modal-stub').exists()).toBe(true);
  });

  it('导出对话会带上当前 scope 的消息并给出成功提示', async () => {
    streamChatWithRecoveryMock.mockImplementation(async function* () {
      yield { type: 'thinking', text: '先看现金流' };
      yield { type: 'content', text: '这是分析结果' };
    });

    const store = useFinanceStore();
    const scopeAccountIds = [store.accounts[0].id, store.accounts[1].id].sort();

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

  it('空对话导出时不会误调用导出，而是提示暂无内容', async () => {
    const wrapper = await mountModal();

    const exportButton = wrapper.findAll('button.icon-btn').find((node) => node.attributes('title') === '导出对话');
    expect(exportButton?.exists()).toBe(true);
    await exportButton!.trigger('click');

    expect(exportChatHistoryMock).not.toHaveBeenCalled();
    expect(messageInfo).toHaveBeenCalledWith('暂无对话内容');
    expect(messageSuccess).not.toHaveBeenCalled();
  });

  it('Enter 会直接发送，Shift+Enter 仅保留输入且不触发发送', async () => {
    streamChatWithRecoveryMock.mockImplementation(async function* () {
      yield { type: 'content', text: '回车发送成功' };
    });

    const wrapper = await mountModal();
    const textarea = wrapper.find('textarea.a-textarea');

    await textarea.setValue('按回车发送');
    await textarea.trigger('keydown.enter', { shiftKey: true });
    await nextTick();

    expect(streamChatWithRecoveryMock).not.toHaveBeenCalled();
    expect((textarea.element as HTMLTextAreaElement).value).toBe('按回车发送');

    await textarea.trigger('keydown.enter');
    await flushPromises();
    await nextTick();

    expect(streamChatWithRecoveryMock).toHaveBeenCalledTimes(1);
    expect((wrapper.find('textarea.a-textarea').element as HTMLTextAreaElement).value).toBe('');
    expect(wrapper.text()).toContain('回车发送成功');
  });

  it('点击预设会直接发起分析，但不会清掉当前草稿输入框', async () => {
    streamChatWithRecoveryMock.mockImplementation(async function* () {
      yield { type: 'content', text: '预设分析结果' };
    });

    const store = useFinanceStore();
    const scopeKey = createChatDraftScopeKey({ accountIds: [store.accounts[0].id, store.accounts[1].id] });
    const wrapper = await mountModal();

    await wrapper.find('textarea.a-textarea').setValue('稍后再问的草稿');
    await wrapper.find('button.preset-item').trigger('click');
    await flushPromises();
    await nextTick();

    expect(streamChatWithRecoveryMock).toHaveBeenCalledTimes(1);
    expect(wrapper.findAll('.msg-row')[0]?.text()).toContain('请分析我的财务状况');
    expect(wrapper.text()).toContain('预设分析结果');
    expect((wrapper.find('textarea.a-textarea').element as HTMLTextAreaElement).value).toBe('稍后再问的草稿');
    expect(localStorage.getItem(scopeKey)).toBe('稍后再问的草稿');
  });

  it('点击预设时会复用最近对话历史，避免同一会话上下文突然丢失', async () => {
    streamChatWithRecoveryMock.mockImplementation(async function* () {
      yield { type: 'content', text: '第一轮回答' };
    });

    const wrapper = await mountModal();

    await wrapper.find('textarea.a-textarea').setValue('第一轮问题');
    await wrapper.find('button.a-button').trigger('click');
    await flushPromises();
    await nextTick();

    streamChatWithRecoveryMock.mockReset();
    streamChatWithRecoveryMock.mockImplementation(async function* () {
      yield { type: 'content', text: '第二轮预设回答' };
    });

    await wrapper.find('button.quick-btn').trigger('click');
    await flushPromises();
    await nextTick();

    expect(streamChatWithRecoveryMock).toHaveBeenCalledTimes(1);
    const [, messages] = streamChatWithRecoveryMock.mock.calls[0] as [unknown, ChatMessage[]];
    expect(messages[0]).toEqual(expect.objectContaining({ role: 'system' }));
    expect(messages).toEqual(expect.arrayContaining([
      { role: 'user', content: '第一轮问题' },
      { role: 'assistant', content: '第一轮回答' },
    ]));
    expect(messages.at(-1)).toEqual(expect.objectContaining({ role: 'user' }));
    expect(wrapper.text()).toContain('第二轮预设回答');
  });

  it('手动修改问题后再次发送，不会把上一次失败 partial 当成同题重试去替换', async () => {
    streamChatWithRecoveryMock
      .mockImplementationOnce(async function* () {
        yield { type: 'content', text: '旧问题的半截回答' };
        throw new Error('临时失败');
      })
      .mockImplementationOnce(async function* (_config: unknown, messages: ChatMessage[]) {
        expect(messages).toEqual(expect.arrayContaining([
          { role: 'user', content: '旧问题' },
          { role: 'assistant', content: '旧问题的半截回答' },
          { role: 'user', content: '新问题' },
        ]));
        yield { type: 'content', text: '新问题的完整回答' };
      });

    const wrapper = await mountModal();

    await wrapper.find('textarea.a-textarea').setValue('旧问题');
    await wrapper.find('button.a-button').trigger('click');
    await flushPromises();
    await nextTick();

    expect(wrapper.text()).toContain('旧问题的半截回答');
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);

    await wrapper.find('textarea.a-textarea').setValue('新问题');
    await wrapper.find('button.a-button').trigger('click');
    await flushPromises();
    await nextTick();

    const rows = wrapper.findAll('.msg-row');
    expect(rows).toHaveLength(4);
    expect(rows[1]?.text()).toContain('旧问题的半截回答');
    expect(rows[2]?.text()).toContain('新问题');
    expect(rows[3]?.text()).toContain('新问题的完整回答');
    expect(wrapper.text()).toContain('旧问题的半截回答');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('同题重试再次失败时，只保留最新一轮 partial，不会把多次失败残片叠进历史', async () => {
    streamChatWithRecoveryMock
      .mockImplementationOnce(async function* () {
        yield { type: 'thinking', text: '第一次思路' };
        yield { type: 'content', text: '第一次半截回答' };
        throw new Error('第一次失败');
      })
      .mockImplementationOnce(async function* (_config: unknown, messages: ChatMessage[]) {
        expect(messages).not.toEqual(expect.arrayContaining([
          expect.objectContaining({ role: 'assistant', content: '第一次半截回答' }),
        ]));
        expect(messages).toEqual(expect.arrayContaining([
          { role: 'user', content: '重复问题' },
        ]));
        yield { type: 'thinking', text: '第二次思路' };
        yield { type: 'content', text: '第二次半截回答' };
        throw new Error('第二次失败');
      })
      .mockImplementationOnce(async function* (_config: unknown, messages: ChatMessage[]) {
        expect(messages).not.toEqual(expect.arrayContaining([
          expect.objectContaining({ role: 'assistant', content: '第二次半截回答' }),
        ]));
        expect(messages).toEqual(expect.arrayContaining([
          { role: 'user', content: '重复问题' },
        ]));
        yield { type: 'content', text: '第三次终于成功' };
      });

    const wrapper = await mountModal();
    const store = useFinanceStore();
    const historyKey = `fm-ai-chat:${[store.accounts[0].id, store.accounts[1].id].sort().join(',')}`;

    await wrapper.find('textarea.a-textarea').setValue('重复问题');
    await wrapper.find('button.a-button').trigger('click');
    await flushPromises();
    await nextTick();

    expect(wrapper.text()).toContain('第一次半截回答');
    expect(wrapper.findAll('.msg-row')).toHaveLength(2);
    expect(wrapper.find('[role="alert"]').text()).toContain('请求失败: 第一次失败');

    await wrapper.findAll('button.request-retry-btn').find((node) => node.text() === '直接重试')!.trigger('click');
    await flushPromises();
    await nextTick();

    const rowsAfterSecondFail = wrapper.findAll('.msg-row');
    expect(rowsAfterSecondFail).toHaveLength(2);
    expect(wrapper.text()).toContain('第二次半截回答');
    expect(wrapper.text()).not.toContain('第一次半截回答');
    expect(wrapper.find('[role="alert"]').text()).toContain('请求失败: 第二次失败');

    const savedAfterSecondFail = localStorage.getItem(historyKey) ?? '';
    expect(savedAfterSecondFail).toContain('第二次半截回答');
    expect(savedAfterSecondFail).not.toContain('第一次半截回答');

    await wrapper.findAll('button.request-retry-btn').find((node) => node.text() === '直接重试')!.trigger('click');
    await flushPromises();
    await nextTick();

    const rowsAfterSuccess = wrapper.findAll('.msg-row');
    expect(rowsAfterSuccess).toHaveLength(2);
    expect(rowsAfterSuccess[1]?.text()).toContain('第三次终于成功');
    expect(wrapper.text()).not.toContain('第二次半截回答');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);

    const savedAfterSuccess = localStorage.getItem(historyKey) ?? '';
    expect(savedAfterSuccess).toContain('第三次终于成功');
    expect(savedAfterSuccess).not.toContain('第一次半截回答');
    expect(savedAfterSuccess).not.toContain('第二次半截回答');
  });
 
  it('多账户顺序变化时会复用同一份 scope 历史与草稿，不会因为顺序抖动串台', async () => {
    const store = useFinanceStore();
    const [accountA, accountB] = store.accounts;
    const normalizedScopeKey = `fm-ai-chat:${[accountA.id, accountB.id].sort().join(',')}`;
    const normalizedDraftKey = createChatDraftScopeKey({ accountIds: [accountA.id, accountB.id] });

    localStorage.setItem(normalizedScopeKey, JSON.stringify([
      { role: 'user', content: '稳定的多账户问题' },
      { role: 'assistant', content: '稳定的多账户回答' },
    ] satisfies ChatRecord[]));
    localStorage.setItem(normalizedDraftKey, '稳定的多账户草稿');

    const wrapper = await mountModal();
    expect(wrapper.text()).toContain('稳定的多账户问题');
    expect((wrapper.find('textarea.a-textarea').element as HTMLTextAreaElement).value).toBe('稳定的多账户草稿');

    store.multiAccountSelection = [accountB.id, accountA.id];
    await nextTick();
    await nextTick();

    expect(wrapper.text()).toContain('稳定的多账户问题');
    expect((wrapper.find('textarea.a-textarea').element as HTMLTextAreaElement).value).toBe('稳定的多账户草稿');
    expect(localStorage.getItem(normalizedDraftKey)).toBe('稳定的多账户草稿');
  });

  it('scope 切换加载草稿时不会把旧 scope 草稿误写到新 scope', async () => {
    const store = useFinanceStore();
    const [accountA, accountB] = store.accounts;
    const multiDraftKey = createChatDraftScopeKey({ accountIds: [accountA.id, accountB.id] });
    const singleDraftKey = createChatDraftScopeKey({ accountIds: [accountA.id] });

    localStorage.setItem(multiDraftKey, '多账户草稿');
    localStorage.setItem(singleDraftKey, '单账户草稿');

    const wrapper = await mountModal();
    expect((wrapper.find('textarea.a-textarea').element as HTMLTextAreaElement).value).toBe('多账户草稿');

    store.viewMode = 'single';
    store.multiAccountSelection = [];
    store.currentAccountId = accountA.id;
    await nextTick();
    await nextTick();

    expect((wrapper.find('textarea.a-textarea').element as HTMLTextAreaElement).value).toBe('单账户草稿');
    expect(localStorage.getItem(singleDraftKey)).toBe('单账户草稿');
    expect(localStorage.getItem(multiDraftKey)).toBe('多账户草稿');
  });

  it('清空对话只会清掉当前 scope 的历史与草稿，不影响其它 scope', async () => {
    const store = useFinanceStore();
    const [accountA, accountB] = store.accounts;
    const multiScopeKey = `fm-ai-chat:${[accountA.id, accountB.id].sort().join(',')}`;
    const singleScopeKey = `fm-ai-chat:${accountA.id}`;
    const multiDraftKey = createChatDraftScopeKey({ accountIds: [accountA.id, accountB.id] });
    const singleDraftKey = createChatDraftScopeKey({ accountIds: [accountA.id] });

    localStorage.setItem(multiScopeKey, JSON.stringify([
      { role: 'user', content: '多账户问题' },
      { role: 'assistant', content: '多账户回答' },
    ] satisfies ChatRecord[]));
    localStorage.setItem(singleScopeKey, JSON.stringify([
      { role: 'user', content: '单账户问题' },
      { role: 'assistant', content: '单账户回答' },
    ] satisfies ChatRecord[]));
    localStorage.setItem(multiDraftKey, '多账户草稿');
    localStorage.setItem(singleDraftKey, '单账户草稿');

    const wrapper = await mountModal();
    expect(wrapper.text()).toContain('多账户问题');
    expect((wrapper.find('textarea.a-textarea').element as HTMLTextAreaElement).value).toBe('多账户草稿');

    await wrapper.findAll('button.icon-btn')[1].trigger('click');
    await nextTick();

    expect(localStorage.getItem(multiScopeKey)).toBeNull();
    expect(localStorage.getItem(multiDraftKey)).toBeNull();
    expect(localStorage.getItem(singleScopeKey)).toContain('单账户问题');
    expect(localStorage.getItem(singleDraftKey)).toBe('单账户草稿');
    expect(wrapper.findAll('.msg-row')).toHaveLength(0);
    expect((wrapper.find('textarea.a-textarea').element as HTMLTextAreaElement).value).toBe('');
    expect(messageSuccess).toHaveBeenCalledWith('当前账户组合对话与草稿已清空');
  });
});
