import { describe, expect, it } from 'vitest';
import {
  buildAiChatCompletionsUrl,
  isAllowedAiProxyTarget,
  normalizeAiBaseUrl,
  sanitizeAiConfig,
} from '@/utils/ai';

describe('ai proxy target guards', () => {
  it('允许标准 OpenAI 兼容 chat completions 地址', () => {
    expect(isAllowedAiProxyTarget('https://api.openai.com/v1/chat/completions')).toBe(true);
    expect(isAllowedAiProxyTarget('https://api.deepseek.com/chat/completions')).toBe(true);
  });

  it('拒绝非 http(s)、非 completions 路径和本地内网目标', () => {
    expect(isAllowedAiProxyTarget('file:///etc/passwd')).toBe(false);
    expect(isAllowedAiProxyTarget('http://127.0.0.1:8080/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://192.168.1.10/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://10.0.0.8/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://172.16.0.9/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://127.0.0.1:8080/admin')).toBe(false);
    expect(isAllowedAiProxyTarget('not-a-url')).toBe(false);
  });
});

describe('ai config normalization', () => {
  it('接受 base URL，并自动补成 chat completions 目标', () => {
    expect(normalizeAiBaseUrl('https://api.openai.com/')).toBe('https://api.openai.com');
    expect(buildAiChatCompletionsUrl('https://api.openai.com')).toBe('https://api.openai.com/v1/chat/completions');
  });

  it('接受完整 chat completions 地址，并回收为标准 base URL', () => {
    expect(normalizeAiBaseUrl('https://api.deepseek.com/chat/completions')).toBe('https://api.deepseek.com');
    expect(normalizeAiBaseUrl('https://api.openai.com/v1/chat/completions')).toBe('https://api.openai.com/v1');
  });

  it('sanitizeAiConfig 会裁剪字段并补默认模型', () => {
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
  });

  it('拒绝不安全的 API 地址', () => {
    expect(() => normalizeAiBaseUrl('http://127.0.0.1:11434')).toThrow(/不安全|不受支持/);
    expect(() => normalizeAiBaseUrl('notaurl')).toThrow(/格式不正确/);
  });
});
