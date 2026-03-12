/**
 * AI 对话持久化（轻量模块）
 *
 * 目的：store/非 AI UI 仅需调用清理逻辑，不应把完整 ai.ts 打进 index。
 */

import { formatLocalISODate } from '@/utils/date';

export interface ChatHistoryScope {
  accountIds?: string[];
}

export interface ChatRecord {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
}

const CHAT_KEY = 'fm-ai-chat';
const CHAT_DRAFT_KEY = 'fm-ai-draft';

const normalizeScopeAccountIds = (accountIds?: string[]): string[] => {
  if (!accountIds?.length) return [];
  return Array.from(new Set(accountIds.map((id) => id.trim()).filter(Boolean))).sort();
};

export const createChatHistoryScopeKey = (scope?: ChatHistoryScope): string => {
  const accountIds = normalizeScopeAccountIds(scope?.accountIds);
  if (!accountIds.length) return CHAT_KEY;
  return `${CHAT_KEY}:${accountIds.join(',')}`;
};

const createChatRecordId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeChatRecord = (record: ChatRecord): ChatRecord => ({
  ...record,
  id: record.id?.trim() || createChatRecordId(),
});

export const loadChatHistory = (scope?: ChatHistoryScope): ChatRecord[] => {
  try {
    const scopedKey = createChatHistoryScopeKey(scope);
    const raw = localStorage.getItem(scopedKey);
    if (raw) {
      return (JSON.parse(raw) as ChatRecord[]).map(normalizeChatRecord);
    }

    if (scopedKey !== CHAT_KEY) {
      const legacyRaw = localStorage.getItem(CHAT_KEY);
      return legacyRaw ? (JSON.parse(legacyRaw) as ChatRecord[]).map(normalizeChatRecord) : [];
    }

    return [];
  } catch {
    return [];
  }
};

export const saveChatHistory = (messages: ChatRecord[], scope?: ChatHistoryScope) => {
  localStorage.setItem(createChatHistoryScopeKey(scope), JSON.stringify(messages.map(normalizeChatRecord)));
};

export const clearChatHistory = (scope?: ChatHistoryScope) => {
  localStorage.removeItem(createChatHistoryScopeKey(scope));
};

export const createChatDraftScopeKey = (scope?: ChatHistoryScope): string => {
  const accountIds = normalizeScopeAccountIds(scope?.accountIds);
  if (!accountIds.length) return CHAT_DRAFT_KEY;
  return `${CHAT_DRAFT_KEY}:${accountIds.join(',')}`;
};

export const loadChatDraft = (scope?: ChatHistoryScope): string => {
  try {
    const scopedKey = createChatDraftScopeKey(scope);
    const raw = localStorage.getItem(scopedKey);
    if (typeof raw === 'string') {
      return raw;
    }

    if (scopedKey !== CHAT_DRAFT_KEY) {
      return localStorage.getItem(CHAT_DRAFT_KEY) ?? '';
    }

    return '';
  } catch {
    return '';
  }
};

export const saveChatDraft = (draft: string, scope?: ChatHistoryScope) => {
  const scopedKey = createChatDraftScopeKey(scope);
  if (!draft.trim()) {
    localStorage.removeItem(scopedKey);
    return;
  }
  localStorage.setItem(scopedKey, draft);
};

export const clearChatDraft = (scope?: ChatHistoryScope) => {
  localStorage.removeItem(createChatDraftScopeKey(scope));
};

const clearScopedStorageKeysByAccountIds = (prefix: string, accountIds?: string[]) => {
  const normalizedAccountIds = normalizeScopeAccountIds(accountIds);
  if (!normalizedAccountIds.length) return;

  const keysToRemove: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !key.startsWith(`${prefix}:`)) continue;

    const scopedPart = key.slice(prefix.length + 1);
    const scopedAccountIds = normalizeScopeAccountIds(scopedPart.split(','));
    if (!scopedAccountIds.length) continue;

    if (normalizedAccountIds.some((accountId) => scopedAccountIds.includes(accountId))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => {
    localStorage.removeItem(key);
  });
};

export const clearChatPersistenceByAccountIds = (accountIds?: string[]) => {
  clearScopedStorageKeysByAccountIds(CHAT_KEY, accountIds);
  clearScopedStorageKeysByAccountIds(CHAT_DRAFT_KEY, accountIds);
};

export const exportChatHistory = (messages: ChatRecord[], scope?: ChatHistoryScope) => {
  const text = messages
    .map((m) => {
      const prefix = m.role === 'user' ? '## 提问' : '## 回答';
      const thinking = m.thinking ? `\n<details><summary>思考过程</summary>\n\n${m.thinking}\n</details>\n` : '';
      return `${prefix}\n\n${m.content}${thinking}`;
    })
    .join('\n\n---\n\n');

  const scopedAccountIds = normalizeScopeAccountIds(scope?.accountIds);
  const scopeLabel = scopedAccountIds.length ? `-${scopedAccountIds.join('_')}` : '';

  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `财务分析对话${scopeLabel}-${formatLocalISODate()}.md`;
  a.click();
  URL.revokeObjectURL(url);
};
