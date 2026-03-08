import { describe, expect, it } from 'vitest';

const isAllowedProxyTarget = (targetUrl: string): boolean => {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return false;
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return false;
  }

  return parsedUrl.pathname.replace(/\/+$/, '').endsWith('/chat/completions');
};

describe('ai proxy target guards', () => {
  it('允许标准 OpenAI 兼容 chat completions 地址', () => {
    expect(isAllowedProxyTarget('https://api.openai.com/v1/chat/completions')).toBe(true);
    expect(isAllowedProxyTarget('https://api.deepseek.com/chat/completions')).toBe(true);
  });

  it('拒绝非 http(s) 协议与任意其他路径', () => {
    expect(isAllowedProxyTarget('file:///etc/passwd')).toBe(false);
    expect(isAllowedProxyTarget('http://127.0.0.1:8080/admin')).toBe(false);
    expect(isAllowedProxyTarget('not-a-url')).toBe(false);
  });
});
