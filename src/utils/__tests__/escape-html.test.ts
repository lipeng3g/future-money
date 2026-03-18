import { describe, expect, it } from 'vitest';
import { escapeHtml } from '@/utils/escape-html';

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes ampersand', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
  });

  it('escapes less than', () => {
    expect(escapeHtml('a < b')).toBe('a &lt; b');
  });

  it('escapes greater than', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("say 'hello'")).toBe("say &#39;hello&#39;");
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('handles string with no special characters', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  it('escapes all special characters together', () => {
    expect(escapeHtml('<>&"\'test')).toBe('&lt;&gt;&amp;&quot;&#39;test');
  });

  it('preserves newlines and spaces', () => {
    expect(escapeHtml('hello\nworld')).toBe('hello\nworld');
    expect(escapeHtml('hello   world')).toBe('hello   world');
  });
});