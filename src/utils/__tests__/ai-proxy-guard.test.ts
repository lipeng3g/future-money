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
    expect(isAllowedAiProxyTarget('http://localhost./v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://192.168.1.10/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://10.0.0.8/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://172.16.0.9/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://169.254.10.20/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://100.64.0.8/v1/chat/completions')).toBe(false);
    // Node URL parser will normalize some "obfuscated" IPv4 forms into dotted quads.
    // E.g. http://127/ => 0.0.0.127
    expect(isAllowedAiProxyTarget('http://127/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://0.0.0.127/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://0x7f000001/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://2130706433/v1/chat/completions')).toBe(false);

    // More IPv4 normalization cases (short form / octal / hex / integer).
    expect(isAllowedAiProxyTarget('http://127.1/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://127.0.1/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://0177.0.0.1/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://0x7f.0x0.0x0.0x1/v1/chat/completions')).toBe(false);

    // Broadcast / max-int forms.
    expect(isAllowedAiProxyTarget('http://255.255.255.255/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://0xffffffff/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://4294967295/v1/chat/completions')).toBe(false);

    // Private network via octal-ish dotted quads.
    expect(isAllowedAiProxyTarget('http://0300.0250.0000.0001/v1/chat/completions')).toBe(false);

    // 0.0.0.0 special forms.
    expect(isAllowedAiProxyTarget('http://0/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://0000/v1/chat/completions')).toBe(false);

    expect(isAllowedAiProxyTarget('http://[::1]:8080/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://[::ffff:127.0.0.1]/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://[::ffff:7f00:1]/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://[fc00::1]/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://[fd12:3456::8]/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://[fe80::1]/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://127.0.0.1:8080/admin')).toBe(false);
    expect(isAllowedAiProxyTarget('http://127.0.0.1.nip.io/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://127.0.0.1.nip.io./v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://127-0-0-1.sslip.io/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://127-0-0-1.sslip.io./v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://lvh.me/v1/chat/completions')).toBe(false);
    expect(isAllowedAiProxyTarget('http://lvh.me./v1/chat/completions')).toBe(false);
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

  it('忽略 query/hash，并拒绝包含 username/password 的 URL', () => {
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

  it('proxy target guard 也拒绝 query/hash 与包含 credentials 的 URL', () => {
    expect(isAllowedAiProxyTarget('https://api.openai.com/v1/chat/completions?foo=bar')).toBe(false);
    expect(isAllowedAiProxyTarget('https://api.openai.com/v1/chat/completions#frag')).toBe(false);
    expect(isAllowedAiProxyTarget('https://user:pass@api.openai.com/v1/chat/completions')).toBe(false);
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

  it('拒绝不安全的 API 地址，并给出明确原因', () => {
    expect(() => normalizeAiBaseUrl('http://127.0.0.1:11434')).toThrow(/不安全/);
    expect(() => normalizeAiBaseUrl('http://169.254.0.1:11434')).toThrow(/不安全/);
    expect(() => normalizeAiBaseUrl('http://[fd00::1]/v1/chat/completions')).toThrow(/不安全/);
    expect(() => normalizeAiBaseUrl('http://127.0.0.1.nip.io/v1/chat/completions')).toThrow(/不安全/);
    expect(() => normalizeAiBaseUrl('https://fd.com')).not.toThrow();
    expect(() => normalizeAiBaseUrl('notaurl')).toThrow(/格式不正确/);
  });
});
