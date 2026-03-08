import { describe, expect, it, vi } from 'vitest';
import {
  createCachedMarkdownRenderer,
  createStreamingMarkdownRenderer,
} from '@/utils/markdown';

describe('createCachedMarkdownRenderer', () => {
  it('对相同输入命中缓存，避免重复 markdown 渲染', () => {
    const renderer = vi.fn((text: string) => `<p>${text}</p>`);
    const cache = createCachedMarkdownRenderer(renderer);

    expect(cache.render('hello')).toBe('<p>hello</p>');
    expect(cache.render('hello')).toBe('<p>hello</p>');
    expect(cache.render('world')).toBe('<p>world</p>');

    expect(renderer).toHaveBeenCalledTimes(2);
  });

  it('切换 renderer 时会清空旧缓存', () => {
    const firstRenderer = vi.fn((text: string) => `<p>${text}</p>`);
    const secondRenderer = vi.fn((text: string) => `<article>${text}</article>`);
    const cache = createCachedMarkdownRenderer(firstRenderer);

    expect(cache.render('hello')).toBe('<p>hello</p>');
    cache.setRenderer(secondRenderer);
    expect(cache.render('hello')).toBe('<article>hello</article>');

    expect(firstRenderer).toHaveBeenCalledTimes(1);
    expect(secondRenderer).toHaveBeenCalledTimes(1);
  });
});

describe('createStreamingMarkdownRenderer', () => {
  it('流式小碎片更新时复用上一次 html，避免每个 token 全量重渲染', () => {
    const renderer = vi.fn((text: string) => `<p>${text}</p>`);
    const streaming = createStreamingMarkdownRenderer(renderer, { minChars: 10 });

    expect(streaming.render('hello')).toBe('<p>hello</p>');
    expect(streaming.render('hello wo')).toBe('<p>hello</p>');
    expect(streaming.render('hello world!')).toBe('<p>hello world!</p>');

    expect(renderer).toHaveBeenCalledTimes(2);
  });

  it('遇到换行时立即刷新，避免长段落结构滞后太久', () => {
    const renderer = vi.fn((text: string) => `<p>${text}</p>`);
    const streaming = createStreamingMarkdownRenderer(renderer, { minChars: 99 });

    streaming.render('第一行');
    expect(streaming.render('第一行\n- 列表项')).toBe('<p>第一行\n- 列表项</p>');

    expect(renderer).toHaveBeenCalledTimes(2);
  });

  it('immediate 模式会强制输出最终完整 html', () => {
    const renderer = vi.fn((text: string) => `<p>${text}</p>`);
    const streaming = createStreamingMarkdownRenderer(renderer, { minChars: 99 });

    streaming.render('hello');
    expect(streaming.render('hello world', { immediate: true })).toBe('<p>hello world</p>');

    expect(renderer).toHaveBeenCalledTimes(2);
  });
});
