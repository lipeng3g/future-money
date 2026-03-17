import { describe, expect, it } from 'vitest';
import { buildAiChatCompletionsUrl, normalizeAiBaseUrl, sanitizeAiConfig } from '@/utils/ai-config';

describe('ai-config normalization (lightweight module)', () => {
  it('accepts base URL and produces stable normalized value', () => {
    expect(normalizeAiBaseUrl('https://api.openai.com/')).toBe('https://api.openai.com');
    expect(buildAiChatCompletionsUrl('https://api.openai.com')).toBe('https://api.openai.com/v1/chat/completions');
  });

  it('accepts full chat completions URL and normalizes back to base URL', () => {
    expect(normalizeAiBaseUrl('https://api.deepseek.com/chat/completions')).toBe('https://api.deepseek.com');
    expect(normalizeAiBaseUrl('https://api.openai.com/v1/chat/completions')).toBe('https://api.openai.com/v1');
  });

  it('ignores query/hash and rejects URLs with credentials', () => {
    expect(normalizeAiBaseUrl('https://api.openai.com/v1/chat/completions?foo=bar#baz')).toBe('https://api.openai.com/v1');
    expect(() => normalizeAiBaseUrl('https://user:pass@api.openai.com/v1/chat/completions')).toThrow(/用户名或密码/);
  });

  it('rejects non-string baseUrl inputs defensively', () => {
    // @ts-expect-error - runtime hardening test
    expect(() => normalizeAiBaseUrl(null)).toThrow(/格式不正确/);
    // @ts-expect-error - runtime hardening test
    expect(() => normalizeAiBaseUrl(undefined)).toThrow(/格式不正确/);
    // @ts-expect-error - runtime hardening test
    expect(() => normalizeAiBaseUrl(123)).toThrow(/格式不正确/);
  });

  it('rejects unsafe localhost / private / link-local targets', () => {
    expect(() => normalizeAiBaseUrl('http://127.0.0.1:11434')).toThrow(/不安全/);
    expect(() => normalizeAiBaseUrl('http://localhost:11434')).toThrow(/不安全/);
    expect(() => normalizeAiBaseUrl('http://192.168.1.10:11434')).toThrow(/不安全/);
    expect(() => normalizeAiBaseUrl('http://169.254.0.1:11434')).toThrow(/不安全/);
    expect(() => normalizeAiBaseUrl('http://[fd00::1]/v1/chat/completions')).toThrow(/不安全/);
  });

  it('sanitizeAiConfig trims fields and fills default model', () => {
    expect(
      sanitizeAiConfig({
        baseUrl: ' https://api.openai.com/ ',
        apiKey: ' sk-test ',
        model: '   ',
      }),
    ).toEqual({
      baseUrl: 'https://api.openai.com',
      apiKey: 'sk-test',
      model: 'gpt-4o-mini',
    });

    expect(() => sanitizeAiConfig({ baseUrl: 'https://api.openai.com', apiKey: '   ', model: 'x' })).toThrow(/API Key/);
  });

  it('buildAiChatCompletionsUrl avoids duplicating /v1', () => {
    expect(buildAiChatCompletionsUrl('https://api.openai.com/v1')).toBe('https://api.openai.com/v1/chat/completions');
    expect(buildAiChatCompletionsUrl('https://api.openai.com/v1/')).toBe('https://api.openai.com/v1/chat/completions');
  });
});
