<template>
  <a-drawer
    :open="open"
    placement="right"
    :width="560"
    :headerStyle="{ display: 'none' }"
    :bodyStyle="{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }"
    @close="emit('close')"
  >
    <!-- 顶栏 -->
    <div class="drawer-header">
      <div class="drawer-title">财务分析助手</div>
      <div class="drawer-actions">
        <button class="icon-btn" @click="handleExport" title="导出对话">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button class="icon-btn" @click="handleClearChat" title="清空对话">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
        <button class="icon-btn" @click="configOpen = true" title="API 设置">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        </button>
        <button class="icon-btn close-btn" @click="emit('close')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>

    <!-- 账户选择 -->
    <div class="account-bar">
      <span class="bar-label">账户</span>
      <a-checkbox-group v-model:value="selectedAccountIds" class="account-checks" :disabled="streaming">
        <a-checkbox v-for="acc in allAccounts" :key="acc.id" :value="acc.id">
          {{ acc.name }}
        </a-checkbox>
      </a-checkbox-group>
      <span class="scope-tip">
        {{ streaming
          ? '分析进行中，暂时锁定当前账户范围，避免本次上下文串台'
          : selectedAccountIds.length > 1
            ? '当前对话与草稿仅保存到这组账户的分析上下文中'
            : '当前对话与草稿仅保存到所选账户中' }}
      </span>
    </div>

    <!-- 对话区 -->
    <div class="chat-area" ref="chatAreaRef">
      <!-- 空状态 -->
      <div v-if="!chatMessages.length && !streaming" class="empty-state">
        <p class="empty-title">有什么可以帮你分析的？</p>
        <p class="empty-sub">选择账户，然后选择一个话题或直接提问</p>
        <div class="preset-list">
          <button
            v-for="preset in presets"
            :key="preset.label"
            class="preset-item"
            :disabled="!selectedAccountIds.length"
            @click="handlePreset(preset)"
          >
            <span class="preset-label">{{ preset.label }}</span>
            <span class="preset-desc">{{ preset.desc }}</span>
          </button>
        </div>
      </div>

      <!-- 消息列表 -->
      <template v-for="msg in chatMessages" :key="msg.id">
        <div class="msg-row" :class="msg.role">
          <div class="msg-bubble">
            <!-- 思考过程（折叠） -->
            <details v-if="msg.thinking" class="thinking-block">
              <summary>思考过程</summary>
              <div class="thinking-content" v-html="renderMd(msg.thinking)"></div>
            </details>
            <div class="msg-content" v-html="renderMd(msg.content)"></div>
          </div>
        </div>
      </template>

      <!-- 流式输出中 -->
      <div v-if="streaming" class="msg-row assistant">
        <div class="msg-bubble">
          <details v-if="thinkingBuffer" class="thinking-block" open>
            <summary>思考中...</summary>
            <div class="thinking-content" v-html="renderStreamingThinkingMd(thinkingBuffer)"></div>
          </details>
          <div v-if="contentBuffer" class="msg-content" v-html="renderStreamingContentMd(contentBuffer)"></div>
          <div v-if="!contentBuffer && !thinkingBuffer" class="msg-content loading-text">正在分析...</div>
        </div>
      </div>
    </div>

    <!-- 底部输入 -->
    <div class="input-bar">
      <div v-if="requestError" class="request-error-banner" role="alert">
        <div class="request-error-copy">
          <strong>分析未完成，但可以恢复</strong>
          <span>{{ requestError }}</span>
          <div v-if="requestErrorMeta.length" class="request-error-meta">{{ requestErrorMeta.join(' · ') }}</div>
          <div v-if="requestDiagnostics" class="request-error-meta request-error-meta--copyable">诊断：{{ requestDiagnostics }}</div>
        </div>
        <div class="request-error-actions">
          <button
            class="request-retry-btn"
            :disabled="!lastSubmittedQuestion || streaming || !selectedAccountIds.length"
            @click="handleRestoreFailedQuestion"
          >
            继续编辑上次问题
          </button>
          <button
            class="request-retry-btn"
            :disabled="!lastSubmittedQuestion || streaming || !selectedAccountIds.length"
            @click="handleRetry"
          >
            直接重试
          </button>
          <button
            v-if="requestDiagnostics"
            class="request-retry-btn"
            :disabled="streaming"
            @click="handleCopyDiagnostics"
          >
            复制诊断
          </button>
        </div>
      </div>
      <div v-if="chatMessages.length" class="quick-row">
        <button
          v-for="preset in presets"
          :key="preset.label"
          class="quick-btn"
          :disabled="!selectedAccountIds.length || streaming"
          @click="handlePreset(preset)"
        >
          {{ preset.label }}
        </button>
      </div>
      <div class="send-row">
        <a-textarea
          v-model:value="userInput"
          placeholder="输入你的问题..."
          :autoSize="{ minRows: 1, maxRows: 4 }"
          :disabled="!selectedAccountIds.length || streaming"
          @pressEnter="handleEnter"
        />
        <a-button
          type="primary"
          :disabled="!userInput.trim() || !selectedAccountIds.length || streaming"
          :loading="streaming"
          @click="handleSend"
        >
          发送
        </a-button>
      </div>
    </div>

    <!-- 配置弹窗 -->
    <AiConfigModal :open="configOpen" @cancel="configOpen = false" @saved="configOpen = false" />
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { message } from 'ant-design-vue';
import { useFinanceStore } from '@/stores/finance';
import AiConfigModal from '@/components/ai/AiConfigModal.vue';
import { loadAiConfig } from '@/utils/ai-config';
import {
  loadChatHistory,
  saveChatHistory,
  clearChatHistory,
  exportChatHistory,
  loadChatDraft,
  saveChatDraft,
  clearChatDraft,
  type ChatRecord,
} from '@/utils/ai-storage';
import {
  streamChatWithRecovery,
  buildFinancialSummary,
  buildScopedFinancialContext,
  createAnalysisMessages,
  AiRequestError,
  type ChatMessage,
} from '@/utils/ai';
import {
  createCachedMarkdownRenderer,
  createStreamingMarkdownRenderer,
} from '@/utils/markdown';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits(['close']);

const store = useFinanceStore();
const fallbackMdRenderer = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
const cachedMdRenderer = createCachedMarkdownRenderer(fallbackMdRenderer);
const streamingContentRenderer = createStreamingMarkdownRenderer(fallbackMdRenderer);
const streamingThinkingRenderer = createStreamingMarkdownRenderer(fallbackMdRenderer);
const mdRenderer = ref<(text: string) => string>(fallbackMdRenderer);

const configOpen = ref(false);
const allAccounts = computed(() => store.accounts);
const selectedAccountIds = ref<string[]>([]);
const normalizeAccountScopeIds = (accountIds: string[]) => {
  return Array.from(new Set(accountIds.map((id) => id.trim()).filter(Boolean))).sort();
};

const chatHistoryScope = computed(() => ({
  accountIds: normalizeAccountScopeIds(selectedAccountIds.value),
}));

watch(
  [() => store.isMultiAccountView, () => store.selectedAccountIds.join(','), () => store.currentAccount.id],
  ([isMulti]) => {
    selectedAccountIds.value = isMulti ? [...store.selectedAccountIds] : [store.currentAccount.id];
  },
  { immediate: true },
);

watch(
  chatHistoryScope,
  () => {
    requestError.value = '';
    requestErrorMeta.value = [];
  },
  { deep: true },
);

watch(
  selectedAccountIds,
  () => {
    suppressDraftPersistence.value = true;
    loadScopedChatHistory();
    userInput.value = loadChatDraft(chatHistoryScope.value);
    nextTick(() => {
      suppressDraftPersistence.value = false;
    });
  },
  { deep: true },
);

// 预设
const presets = [
  { label: '财务状况分析', desc: '全面评估收支健康度', question: undefined as string | undefined },
  { label: '风险预警', desc: '未来可能的资金缺口', question: '分析我未来三个月的资金风险，标注具体的风险时间点和涉及的账户' },
  { label: '支出优化', desc: '找出可削减的支出', question: '分析我的支出结构，找出金额最大的几项支出，给出具体的优化建议' },
  { label: '收支趋势', desc: '月度变化与预测', question: '分析月度收支趋势，判断是否可持续，并预测未来走向' },
];

// 对话
const chatMessages = ref<ChatRecord[]>([]);
const streaming = ref(false);
const contentBuffer = ref('');
const thinkingBuffer = ref('');
const userInput = ref('');
const requestError = ref('');
const requestErrorMeta = ref<string[]>([]);
const requestDiagnostics = ref('');
const lastSubmittedQuestion = ref('');
const lastFailedQuestion = ref('');
const lastFailedAssistantMessage = ref<ChatRecord | null>(null);
const chatAreaRef = ref<HTMLElement | null>(null);
const activeRequestController = ref<AbortController | null>(null);
const suppressDraftPersistence = ref(false);
let activeRequestId = 0;

const loadScopedChatHistory = () => {
  chatMessages.value = loadChatHistory(chatHistoryScope.value);
};

watch(
  userInput,
  (value) => {
    if (suppressDraftPersistence.value) return;
    saveChatDraft(value, chatHistoryScope.value);
  },
);

onMounted(async () => {
  loadScopedChatHistory();
  userInput.value = loadChatDraft(chatHistoryScope.value);
  const { default: MarkdownIt } = await import('markdown-it');
  const md = new MarkdownIt({ html: false, linkify: true, breaks: true });
  const renderer = (text: string) => md.render(text);
  mdRenderer.value = renderer;
  cachedMdRenderer.setRenderer(renderer);
  streamingContentRenderer.setRenderer(renderer);
  streamingThinkingRenderer.setRenderer(renderer);
});

const scrollToBottom = () => {
  nextTick(() => {
    if (chatAreaRef.value) {
      chatAreaRef.value.scrollTop = chatAreaRef.value.scrollHeight;
    }
  });
};

const renderMd = (text: string): string => cachedMdRenderer.render(text);
const renderStreamingContentMd = (text: string): string => streamingContentRenderer.render(text);
const renderStreamingThinkingMd = (text: string): string => streamingThinkingRenderer.render(text);

const getFinancialContext = () => {
  return buildScopedFinancialContext({
    accounts: store.accounts,
    selectedAccountIds: selectedAccountIds.value,
    events: store.events,
    reconciliations: store.reconciliations,
    ledgerEntries: store.ledgerEntries,
    eventOverrides: store.eventOverrides,
    viewMonths: store.viewMonths,
    today: store.todayStr,
  });
};

const cancelActiveRequest = () => {
  activeRequestController.value?.abort();
  activeRequestController.value = null;
};

const resetStreamingState = (options?: { preserveBuffers?: boolean }) => {
  streaming.value = false;
  if (!options?.preserveBuffers) {
    contentBuffer.value = '';
    thinkingBuffer.value = '';
    streamingContentRenderer.reset();
    streamingThinkingRenderer.reset();
  }
};

const buildDiagnosticsText = (parts: {
  provider?: string;
  model?: string;
  traceId?: string;
  status?: number;
  retries?: number;
}) => {
  return [
    parts.provider ? `provider=${parts.provider}` : null,
    parts.model ? `model=${parts.model}` : null,
    parts.traceId ? `traceId=${parts.traceId}` : null,
    typeof parts.status === 'number' ? `httpStatus=${parts.status}` : null,
    typeof parts.retries === 'number' ? `retries=${parts.retries}` : null,
  ].filter(Boolean).join(' | ');
};

const isAsyncIterable = (value: unknown): value is AsyncIterable<{ type: 'content' | 'thinking'; text: string }> => {
  return !!value && typeof (value as AsyncIterable<unknown>)[Symbol.asyncIterator] === 'function';
};

const sendToAi = async (question?: string) => {
  if (streaming.value) return;

  const normalizedQuestion = question?.trim();
  const promptQuestion = normalizedQuestion || undefined;
  const displayQuestion = promptQuestion || '请分析我的财务状况';

  const config = loadAiConfig();
  if (!config) {
    configOpen.value = true;
    return;
  }

  const hadExplicitQuestion = typeof question === 'string';
  const isRetryingFailedQuestion = !!lastFailedAssistantMessage.value && displayQuestion === lastFailedQuestion.value;
  const existingMessages = isRetryingFailedQuestion
    ? chatMessages.value.filter((message) => message !== lastFailedAssistantMessage.value)
    : [...chatMessages.value];
  const shouldAppendUserMessage = !hadExplicitQuestion || existingMessages.at(-1)?.role !== 'user' || existingMessages.at(-1)?.content !== displayQuestion;

  if (isRetryingFailedQuestion) {
    chatMessages.value = existingMessages;
  }

  if (shouldAppendUserMessage) {
    chatMessages.value.push({
      role: 'user',
      content: displayQuestion,
    });
    saveChatHistory(chatMessages.value, chatHistoryScope.value);
    scrollToBottom();
  }

  requestError.value = '';
  requestErrorMeta.value = [];
  lastSubmittedQuestion.value = displayQuestion;
  if (!isRetryingFailedQuestion) {
    lastFailedQuestion.value = '';
  }
  lastFailedAssistantMessage.value = null;

  const ctx = getFinancialContext();
  const summary = buildFinancialSummary(ctx);
  const apiMessages = createAnalysisMessages(summary, promptQuestion);

  const historyMessages: ChatMessage[] = chatMessages.value.slice(-6).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  const fullMessages: ChatMessage[] = [
    apiMessages[0],
    ...historyMessages,
    apiMessages[apiMessages.length - 1],
  ];

  const requestId = ++activeRequestId;
  const controller = new AbortController();
  activeRequestController.value = controller;

  streaming.value = true;
  contentBuffer.value = '';
  thinkingBuffer.value = '';
  streamingContentRenderer.reset();
  streamingThinkingRenderer.reset();

  try {
    const recoveryCallResult = streamChatWithRecovery(config, fullMessages, { signal: controller.signal });

    let recoveryResult: Awaited<ReturnType<typeof streamChatWithRecovery>>;
    if (isAsyncIterable(recoveryCallResult)) {
      for await (const chunk of recoveryCallResult) {
        if (requestId !== activeRequestId) {
          return;
        }

        if (chunk.type === 'thinking') {
          thinkingBuffer.value += chunk.text;
        } else {
          contentBuffer.value += chunk.text;
        }
        scrollToBottom();
      }

      recoveryResult = {
        content: contentBuffer.value,
        thinking: thinkingBuffer.value || undefined,
        retries: 0,
        downgraded: false,
        diagnostics: {
          provider: '',
          model: config.model,
          retryable: false,
        },
      };
    } else {
      recoveryResult = await recoveryCallResult;
      if (requestId !== activeRequestId || controller.signal.aborted) {
        return;
      }

      contentBuffer.value = recoveryResult.content;
      thinkingBuffer.value = recoveryResult.thinking || '';
      scrollToBottom();
    }

    chatMessages.value.push({
      role: 'assistant',
      content: recoveryResult.content,
      thinking: recoveryResult.thinking || undefined,
    });
    saveChatHistory(chatMessages.value, chatHistoryScope.value);
    lastFailedQuestion.value = '';
    lastFailedAssistantMessage.value = null;
    requestDiagnostics.value = '';

    if (recoveryResult.downgraded) {
      message.warning('首包前断流，已自动降级为非流式重试并恢复结果');
    }
  } catch (err: any) {
    if (requestId !== activeRequestId || err?.name === 'AbortError' || controller.signal.aborted) {
      return;
    }

    const errorMessage = err?.message || '未知错误';
    requestError.value = `请求失败: ${errorMessage}`;

    const errorMeta: string[] = [];
    if (err instanceof AiRequestError) {
      if (err.details.provider) errorMeta.push(`provider: ${err.details.provider}`);
      if (err.details.model) errorMeta.push(`model: ${err.details.model}`);
      if (err.details.traceId) errorMeta.push(`trace: ${err.details.traceId}`);
      if (typeof err.details.status === 'number') errorMeta.push(`http: ${err.details.status}`);
      if (typeof err.details.retries === 'number') errorMeta.push(`retries: ${err.details.retries}`);
      if (err.details.downgradedToModel && err.details.downgradeStrategy === 'model-fallback') {
        errorMeta.push(`已降级模型重试: ${err.details.downgradedFromModel} → ${err.details.downgradedToModel}`);
      } else if (err.details.downgradeStrategy === 'non-stream') {
        errorMeta.push('已降级为非流式重试');
      }
      requestDiagnostics.value = buildDiagnosticsText({
        provider: err.details.provider,
        model: err.details.model,
        traceId: err.details.traceId,
        status: err.details.status,
        retries: err.details.retries,
      });
      console.error('[ai-analysis] request failed', {
        message: err.message,
        ...err.details,
      });
    } else {
      requestDiagnostics.value = '';
      console.error('[ai-analysis] request failed', err);
    }
    requestErrorMeta.value = errorMeta;

    lastFailedQuestion.value = lastSubmittedQuestion.value;

    if (contentBuffer.value || thinkingBuffer.value) {
      const partialAssistantMessage = {
        role: 'assistant' as const,
        content: contentBuffer.value || '本次分析在输出途中中断，请稍后重试。',
        thinking: thinkingBuffer.value || undefined,
      };
      chatMessages.value.push(partialAssistantMessage);
      lastFailedAssistantMessage.value = partialAssistantMessage;
      saveChatHistory(chatMessages.value, chatHistoryScope.value);
    }

    message.error(requestError.value);
  } finally {
    if (requestId === activeRequestId) {
      activeRequestController.value = null;
      resetStreamingState();
      scrollToBottom();
    }
  }
};

const handlePreset = (preset: (typeof presets)[number]) => sendToAi(preset.question);

const handleRestoreFailedQuestion = () => {
  const retryQuestion = lastSubmittedQuestion.value.trim();
  if (!retryQuestion || streaming.value) return;
  requestError.value = '';
  requestErrorMeta.value = [];
  userInput.value = retryQuestion;
  saveChatDraft(userInput.value, chatHistoryScope.value);
};

const handleRetry = () => {
  const retryQuestion = lastSubmittedQuestion.value.trim();
  if (!retryQuestion) return;
  void sendToAi(retryQuestion);
};

const handleCopyDiagnostics = async () => {
  if (!requestDiagnostics.value) return;
  await navigator.clipboard.writeText(requestDiagnostics.value);
  message.success('诊断信息已复制');
};

const handleSend = () => {
  const q = userInput.value.trim();
  if (!q) return;
  requestError.value = '';
  requestErrorMeta.value = [];
  clearChatDraft(chatHistoryScope.value);
  userInput.value = '';
  sendToAi(q);
};

const handleEnter = (e: KeyboardEvent) => {
  if (e.shiftKey) return;
  e.preventDefault();
  handleSend();
};

watch(
  () => props.open,
  (open) => {
    if (open) return;
    requestError.value = '';
    requestErrorMeta.value = [];
    requestDiagnostics.value = '';
    lastFailedQuestion.value = '';
    lastFailedAssistantMessage.value = null;
    cancelActiveRequest();
    resetStreamingState();
  },
);

watch(
  chatHistoryScope,
  () => {
    lastFailedQuestion.value = '';
    requestErrorMeta.value = [];
    requestDiagnostics.value = '';
    lastFailedAssistantMessage.value = null;
    if (!streaming.value) return;
    activeRequestId += 1;
    cancelActiveRequest();
    resetStreamingState();
  },
  { deep: true },
);

onBeforeUnmount(() => {
  activeRequestId += 1;
  cancelActiveRequest();
});

const handleClearChat = () => {
  chatMessages.value = [];
  userInput.value = '';
  requestError.value = '';
  requestErrorMeta.value = [];
  requestDiagnostics.value = '';
  lastFailedQuestion.value = '';
  lastFailedAssistantMessage.value = null;
  clearChatHistory(chatHistoryScope.value);
  clearChatDraft(chatHistoryScope.value);
  message.success(selectedAccountIds.value.length > 1 ? '当前账户组合对话与草稿已清空' : '当前账户对话与草稿已清空');
};

const handleExport = () => {
  if (!chatMessages.value.length) {
    message.info('暂无对话内容');
    return;
  }
  exportChatHistory(chatMessages.value, chatHistoryScope.value);
  message.success(selectedAccountIds.value.length > 1 ? '当前账户组合对话已导出' : '当前账户对话已导出');
};
</script>

<style scoped>
/* 顶栏 */
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--fm-border-subtle);
}

.drawer-title {
  font-weight: 600;
  font-size: 1rem;
  color: var(--fm-text-primary);
}

.drawer-actions {
  display: flex;
  gap: 4px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--fm-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.icon-btn:hover {
  background: var(--fm-surface-muted);
  color: var(--fm-text-primary);
}

.close-btn:hover {
  background: #fee2e2;
  color: #dc2626;
}

/* 账户栏 */
.account-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--fm-border-subtle);
  flex-wrap: wrap;
}

.bar-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--fm-text-secondary);
  white-space: nowrap;
}

.account-checks {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.scope-tip {
  font-size: 0.75rem;
  color: var(--fm-text-muted);
  margin-left: auto;
}

/* 对话区 */
.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 20px;
}

.empty-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--fm-text-primary);
  margin: 0 0 4px;
}

.empty-sub {
  font-size: 0.85rem;
  color: var(--fm-text-muted);
  margin: 0 0 24px;
}

.preset-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preset-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid var(--fm-border-subtle);
  background: var(--fm-surface);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.preset-item:hover:not(:disabled) {
  border-color: var(--fm-primary);
  background: var(--fm-surface-muted);
}

.preset-item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.preset-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--fm-text-primary);
}

.preset-desc {
  font-size: 0.78rem;
  color: var(--fm-text-muted);
}

/* 消息 */
.msg-row {
  display: flex;
}

.msg-row.user {
  justify-content: flex-end;
}

.msg-row.assistant {
  justify-content: flex-start;
}

.msg-bubble {
  max-width: 92%;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 0.9rem;
  line-height: 1.7;
}

.msg-row.user .msg-bubble {
  background: var(--fm-surface-muted);
  color: var(--fm-text-primary);
  border-bottom-right-radius: 4px;
}

.msg-row.assistant .msg-bubble {
  background: transparent;
  color: var(--fm-text-primary);
  padding-left: 0;
  padding-right: 0;
}

/* 思考过程 */
.thinking-block {
  margin-bottom: 12px;
  border: 1px solid var(--fm-border-subtle);
  border-radius: 8px;
  overflow: hidden;
}

.thinking-block summary {
  padding: 8px 12px;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--fm-text-muted);
  cursor: pointer;
  background: var(--fm-surface-muted);
  user-select: none;
}

.thinking-block summary:hover {
  color: var(--fm-text-secondary);
}

.thinking-content {
  padding: 12px;
  font-size: 0.82rem;
  color: var(--fm-text-secondary);
  line-height: 1.6;
  max-height: 300px;
  overflow-y: auto;
  background: var(--fm-surface);
}

/* Markdown 内容 */
.msg-content {
  word-break: break-word;
}

.loading-text {
  color: var(--fm-text-muted);
}

.msg-content :deep(h1),
.msg-content :deep(h2),
.msg-content :deep(h3),
.msg-content :deep(h4) {
  margin: 14px 0 6px;
  font-weight: 700;
}

.msg-content :deep(h1) { font-size: 1.15rem; }
.msg-content :deep(h2) { font-size: 1.05rem; }
.msg-content :deep(h3) { font-size: 0.95rem; }

.msg-content :deep(p) { margin: 4px 0; }

.msg-content :deep(ul),
.msg-content :deep(ol) {
  padding-left: 20px;
  margin: 6px 0;
}

.msg-content :deep(li) { margin: 3px 0; }

.msg-content :deep(code) {
  background: rgba(0, 0, 0, 0.05);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.85em;
  font-family: ui-monospace, 'SF Mono', monospace;
}

.msg-content :deep(pre) {
  background: var(--fm-surface-muted);
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 8px 0;
}

.msg-content :deep(strong) { font-weight: 700; }

.msg-content :deep(blockquote) {
  border-left: 3px solid var(--fm-border-subtle);
  padding-left: 12px;
  margin: 8px 0;
  color: var(--fm-text-secondary);
}

.msg-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
  font-size: 0.85rem;
}

.msg-content :deep(th),
.msg-content :deep(td) {
  border: 1px solid var(--fm-border-subtle);
  padding: 5px 10px;
  text-align: left;
}

.msg-content :deep(th) {
  background: var(--fm-surface-muted);
  font-weight: 600;
}

/* 底部输入 */
.input-bar {
  padding: 14px 20px;
  border-top: 1px solid var(--fm-border-subtle);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.request-error-banner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #b91c1c;
  color: #fff;
  font-size: 0.82rem;
}

.request-error-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.request-error-copy strong {
  font-size: 0.82rem;
}

.request-error-meta {
  font-size: 0.74rem;
  color: rgba(255, 255, 255, 0.84);
  word-break: break-word;
}

.request-error-actions {
  display: inline-flex;
  gap: 8px;
  flex-wrap: wrap;
}

.request-retry-btn {
  border: none;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.78rem;
  cursor: pointer;
}

.request-retry-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.request-retry-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.28);
}

.quick-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.quick-btn {
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid var(--fm-border-subtle);
  background: var(--fm-surface);
  color: var(--fm-text-secondary);
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.15s;
}

.quick-btn:hover:not(:disabled) {
  border-color: var(--fm-primary);
  color: var(--fm-primary);
}

.quick-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.send-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.send-row :deep(.ant-input) {
  border-radius: 10px;
}

/* 滚动条 */
.chat-area::-webkit-scrollbar { width: 4px; }
.chat-area::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }
.chat-area::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
.thinking-content::-webkit-scrollbar { width: 3px; }
.thinking-content::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 2px; }
</style>
