import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearChatDraft,
  clearChatHistory,
  createChatDraftScopeKey,
  createChatHistoryScopeKey,
  exportChatHistory,
  loadChatDraft,
  loadChatHistory,
  saveChatDraft,
  saveChatHistory,
  type ChatRecord,
} from '@/utils/ai';

const sampleMessages: ChatRecord[] = [
  { role: 'user', content: '分析主账户' },
  { role: 'assistant', content: '好的' },
];

describe('AI chat history scoping', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('为相同账户集合生成稳定且去重排序后的 scope key', () => {
    expect(createChatHistoryScopeKey({ accountIds: ['b', 'a', 'a'] })).toBe('fm-ai-chat:a,b');
    expect(createChatHistoryScopeKey({ accountIds: [] })).toBe('fm-ai-chat');
    expect(createChatHistoryScopeKey()).toBe('fm-ai-chat');
  });

  it('按账户范围隔离保存和读取对话历史', () => {
    saveChatHistory([{ role: 'user', content: 'A' }], { accountIds: ['acc-a'] });
    saveChatHistory([{ role: 'user', content: 'B' }], { accountIds: ['acc-b'] });

    expect(loadChatHistory({ accountIds: ['acc-a'] })).toEqual([expect.objectContaining({ role: 'user', content: 'A' })]);
    expect(loadChatHistory({ accountIds: ['acc-b'] })).toEqual([expect.objectContaining({ role: 'user', content: 'B' })]);
    expect(loadChatHistory({ accountIds: ['acc-c'] })).toEqual([]);
  });

  it('兼容读取旧版全局对话历史，避免升级后历史瞬间丢失', () => {
    window.localStorage.setItem('fm-ai-chat', JSON.stringify(sampleMessages));

    expect(loadChatHistory({ accountIds: ['acc-a'] })).toEqual(sampleMessages.map((message) => expect.objectContaining(message)));
  });

  it('清空时仅删除当前 scope 的对话历史', () => {
    saveChatHistory([{ role: 'user', content: 'A' }], { accountIds: ['acc-a'] });
    saveChatHistory([{ role: 'user', content: 'B' }], { accountIds: ['acc-b'] });

    clearChatHistory({ accountIds: ['acc-a'] });

    expect(loadChatHistory({ accountIds: ['acc-a'] })).toEqual([]);
    expect(loadChatHistory({ accountIds: ['acc-b'] })).toEqual([expect.objectContaining({ role: 'user', content: 'B' })]);
  });

  it('导出文件名会带上账户 scope，避免多账户导出互相覆盖', () => {
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      value: createObjectURL,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: revokeObjectURL,
      configurable: true,
      writable: true,
    });

    const click = vi.fn();
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click,
    } as unknown as HTMLAnchorElement);

    exportChatHistory(sampleMessages, { accountIds: ['acc-b', 'acc-a'] });

    const anchor = createElementSpy.mock.results[0]?.value as unknown as HTMLAnchorElement;
    expect(anchor.download).toMatch(/^财务分析对话-acc-a_acc-b-\d{4}-\d{2}-\d{2}\.md$/);
    expect(click).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('草稿也会按账户范围隔离保存与读取', () => {
    expect(createChatDraftScopeKey({ accountIds: ['b', 'a', 'a'] })).toBe('fm-ai-draft:a,b');

    saveChatDraft('A 草稿', { accountIds: ['acc-a'] });
    saveChatDraft('B 草稿', { accountIds: ['acc-b'] });

    expect(loadChatDraft({ accountIds: ['acc-a'] })).toBe('A 草稿');
    expect(loadChatDraft({ accountIds: ['acc-b'] })).toBe('B 草稿');
    expect(loadChatDraft({ accountIds: ['acc-c'] })).toBe('');
  });

  it('兼容读取旧版全局草稿，并支持按 scope 清除', () => {
    window.localStorage.setItem('fm-ai-draft', '旧版草稿');
    saveChatDraft('当前草稿', { accountIds: ['acc-a'] });

    expect(loadChatDraft({ accountIds: ['acc-b'] })).toBe('旧版草稿');
    expect(loadChatDraft({ accountIds: ['acc-a'] })).toBe('当前草稿');

    clearChatDraft({ accountIds: ['acc-a'] });
    expect(loadChatDraft({ accountIds: ['acc-a'] })).toBe('旧版草稿');
  });

  it('空白草稿不会持久化，避免无意义残留', () => {
    saveChatDraft('   ', { accountIds: ['acc-a'] });
    expect(window.localStorage.getItem('fm-ai-draft:acc-a')).toBeNull();
  });

  it('保存和读取对话历史时会为缺失 id 的消息补稳定标识，兼容旧数据', () => {
    const stored = [
      { role: 'user', content: '重复问题' },
      { role: 'assistant', content: '重复问题' },
    ] satisfies ChatRecord[];

    window.localStorage.setItem('fm-ai-chat:acc-a', JSON.stringify(stored));

    const loaded = loadChatHistory({ accountIds: ['acc-a'] });
    expect(loaded).toHaveLength(2);
    expect(loaded[0]?.id).toBeTruthy();
    expect(loaded[1]?.id).toBeTruthy();
    expect(loaded[0]?.id).not.toBe(loaded[1]?.id);
    expect(loaded[0]).toEqual(expect.objectContaining(stored[0]));
    expect(loaded[1]).toEqual(expect.objectContaining(stored[1]));

    saveChatHistory(loaded, { accountIds: ['acc-a'] });
    const persisted = JSON.parse(window.localStorage.getItem('fm-ai-chat:acc-a') ?? '[]') as ChatRecord[];
    expect(persisted[0]?.id).toBeTruthy();
    expect(persisted[1]?.id).toBeTruthy();
    expect(persisted[0]?.id).not.toBe(persisted[1]?.id);
  });
});
