import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
});

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'test-uuid-12345'),
});

// Mock URL.createObjectURL and revokeObjectURL
vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => 'blob:http://test'),
  revokeObjectURL: vi.fn(),
});

// Mock document.createElement
const mockCreateElement = vi.fn((tag: string) => {
  const element = {
    tagName: tag.toUpperCase(),
    href: '',
    download: '',
    style: {},
    textContent: '',
    click: vi.fn(),
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  };
  return element;
});

vi.stubGlobal('document', {
  createElement: mockCreateElement,
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  },
});

// Import after mocks
import {
  createChatHistoryScopeKey,
  loadChatHistory,
  saveChatHistory,
  clearChatHistory,
  createChatDraftScopeKey,
  loadChatDraft,
  saveChatDraft,
  clearChatDraft,
  clearChatPersistenceByAccountIds,
  normalizeScopeAccountIds,
} from '@/utils/ai-storage';

describe('ai-storage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.mocked(crypto.randomUUID).mockReturnValue('test-uuid-12345');
  });

  // Note: normalizeScopeAccountIds is private (not exported), tested indirectly via other functions

  describe('createChatHistoryScopeKey', () => {
    it('should return default key for undefined scope', () => {
      expect(createChatHistoryScopeKey(undefined)).toBe('fm-ai-chat');
    });

    it('should return default key for empty account IDs', () => {
      expect(createChatHistoryScopeKey({})).toBe('fm-ai-chat');
      expect(createChatHistoryScopeKey({ accountIds: [] })).toBe('fm-ai-chat');
    });

    it('should return scoped key with account IDs', () => {
      const result = createChatHistoryScopeKey({ accountIds: ['acc1', 'acc2'] });
      expect(result).toBe('fm-ai-chat:acc1,acc2');
    });

    it('should sort account IDs', () => {
      const result = createChatHistoryScopeKey({ accountIds: ['z', 'a', 'm'] });
      expect(result).toBe('fm-ai-chat:a,m,z');
    });
  });

  describe('loadChatHistory', () => {
    it('should return empty array when no data', () => {
      expect(loadChatHistory()).toEqual([]);
    });

    it('should load and normalize chat history', () => {
      localStorageMock.setItem('fm-ai-chat', JSON.stringify([
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'hi there' },
      ]));

      const result = loadChatHistory();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('test-uuid-12345');
      expect(result[0].role).toBe('user');
      expect(result[0].content).toBe('hello');
    });

    it('should fallback to legacy key when scoped key not found', () => {
      localStorageMock.setItem('fm-ai-chat', JSON.stringify([
        { role: 'user', content: 'legacy' },
      ]));

      const result = loadChatHistory({ accountIds: ['acc1'] });
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('legacy');
    });

    it('should return empty array on invalid JSON', () => {
      localStorageMock.setItem('fm-ai-chat', 'invalid json');
      expect(loadChatHistory()).toEqual([]);
    });

    it('should load from scoped key', () => {
      localStorageMock.setItem('fm-ai-chat:acc1,acc2', JSON.stringify([
        { role: 'user', content: 'scoped' },
      ]));

      const result = loadChatHistory({ accountIds: ['acc1', 'acc2'] });
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('scoped');
    });
  });

  describe('saveChatHistory', () => {
    it('should save to localStorage with default key', () => {
      saveChatHistory([
        { role: 'user', content: 'test' },
      ]);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'fm-ai-chat',
        expect.any(String)
      );
    });

    it('should save to scoped key', () => {
      saveChatHistory(
        [{ role: 'user', content: 'test' }],
        { accountIds: ['acc1'] }
      );

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'fm-ai-chat:acc1',
        expect.any(String)
      );
    });

    it('should normalize records before saving (trim id only)', () => {
      saveChatHistory([
        { role: 'user', content: '  hello  ' },
      ]);

      const saved = localStorageMock.setItem.mock.calls[0][1];
      const parsed = JSON.parse(saved);
      // Note: content is NOT trimmed (only id is trimmed in normalizeChatRecord)
      expect(parsed[0].content).toBe('  hello  ');
      expect(parsed[0].id).toBe('test-uuid-12345');
    });
  });

  describe('clearChatHistory', () => {
    it('should remove default key', () => {
      clearChatHistory();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('fm-ai-chat');
    });

    it('should remove scoped key', () => {
      clearChatHistory({ accountIds: ['acc1'] });
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('fm-ai-chat:acc1');
    });
  });

  describe('createChatDraftScopeKey', () => {
    it('should return default key for undefined', () => {
      expect(createChatDraftScopeKey()).toBe('fm-ai-draft');
    });

    it('should return scoped key with account IDs', () => {
      expect(createChatDraftScopeKey({ accountIds: ['acc1'] })).toBe('fm-ai-draft:acc1');
    });
  });

  describe('loadChatDraft', () => {
    it('should return empty string when no data', () => {
      expect(loadChatDraft()).toBe('');
    });

    it('should load draft from localStorage', () => {
      localStorageMock.setItem('fm-ai-draft', 'my draft content');
      expect(loadChatDraft()).toBe('my draft content');
    });

    it('should return string value as-is (including "null")', () => {
      localStorageMock.setItem('fm-ai-draft', 'null');
      expect(loadChatDraft()).toBe('null');
    });

    it('should fallback to legacy key when scoped not found', () => {
      localStorageMock.setItem('fm-ai-draft', 'legacy draft');
      expect(loadChatDraft({ accountIds: ['acc1'] })).toBe('legacy draft');
    });
  });

  describe('saveChatDraft', () => {
    it('should save draft to localStorage', () => {
      saveChatDraft('my draft');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('fm-ai-draft', 'my draft');
    });

    it('should remove key when draft is empty', () => {
      saveChatDraft('');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('fm-ai-draft');
    });

    it('should remove key when draft is whitespace only', () => {
      saveChatDraft('   ');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('fm-ai-draft');
    });
  });

  describe('clearChatDraft', () => {
    it('should remove default key', () => {
      clearChatDraft();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('fm-ai-draft');
    });

    it('should remove scoped key', () => {
      clearChatDraft({ accountIds: ['acc1'] });
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('fm-ai-draft:acc1');
    });
  });

  describe('clearChatPersistenceByAccountIds', () => {
    it('should do nothing for empty account IDs', () => {
      clearChatPersistenceByAccountIds(undefined);
      clearChatPersistenceByAccountIds([]);
      expect(localStorageMock.removeItem).not.toHaveBeenCalled();
    });

    it('should clear matching scoped keys', () => {
      // Set up some keys
      localStorageMock.setItem('fm-ai-chat:acc1', '[]');
      localStorageMock.setItem('fm-ai-chat:acc1,acc2', '[]');
      localStorageMock.setItem('fm-ai-chat:acc2', '[]');
      localStorageMock.setItem('fm-ai-draft:acc1', 'draft');
      localStorageMock.setItem('fm-ai-draft:acc2', 'draft');

      clearChatPersistenceByAccountIds(['acc1']);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('fm-ai-chat:acc1');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('fm-ai-chat:acc1,acc2');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('fm-ai-draft:acc1');
      // Should NOT remove acc2-only keys
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('fm-ai-chat:acc2');
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('fm-ai-draft:acc2');
    });

    it('should handle multiple account IDs', () => {
      localStorageMock.setItem('fm-ai-chat:acc1', '[]');
      localStorageMock.setItem('fm-ai-chat:acc2', '[]');
      localStorageMock.setItem('fm-ai-chat:acc3', '[]');

      clearChatPersistenceByAccountIds(['acc1', 'acc2']);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('fm-ai-chat:acc1');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('fm-ai-chat:acc2');
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('fm-ai-chat:acc3');
    });
  });
});