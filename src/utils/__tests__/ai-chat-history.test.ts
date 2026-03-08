import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearChatHistory,
  createChatHistoryScopeKey,
  exportChatHistory,
  loadChatHistory,
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

    expect(loadChatHistory({ accountIds: ['acc-a'] })).toEqual([{ role: 'user', content: 'A' }]);
    expect(loadChatHistory({ accountIds: ['acc-b'] })).toEqual([{ role: 'user', content: 'B' }]);
    expect(loadChatHistory({ accountIds: ['acc-c'] })).toEqual([]);
  });

  it('兼容读取旧版全局对话历史，避免升级后历史瞬间丢失', () => {
    window.localStorage.setItem('fm-ai-chat', JSON.stringify(sampleMessages));

    expect(loadChatHistory({ accountIds: ['acc-a'] })).toEqual(sampleMessages);
  });

  it('清空时仅删除当前 scope 的对话历史', () => {
    saveChatHistory([{ role: 'user', content: 'A' }], { accountIds: ['acc-a'] });
    saveChatHistory([{ role: 'user', content: 'B' }], { accountIds: ['acc-b'] });

    clearChatHistory({ accountIds: ['acc-a'] });

    expect(loadChatHistory({ accountIds: ['acc-a'] })).toEqual([]);
    expect(loadChatHistory({ accountIds: ['acc-b'] })).toEqual([{ role: 'user', content: 'B' }]);
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
});
