export interface CachedMarkdownRenderer {
  setRenderer(nextRenderer: (text: string) => string): void;
  render(text: string): string;
  clear(): void;
}

export interface StreamingMarkdownRenderer {
  setRenderer(nextRenderer: (text: string) => string): void;
  render(text: string, options?: { immediate?: boolean }): string;
  reset(): void;
}

const DEFAULT_MAX_CACHE_SIZE = 200;
const DEFAULT_STREAM_MIN_CHARS = 96;

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const fallbackRender = (text: string): string => escapeHtml(text).replace(/\n/g, '<br>');

const trimCache = (cache: Map<string, string>, maxSize: number) => {
  while (cache.size > maxSize) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) return;
    cache.delete(oldestKey);
  }
};

export const createCachedMarkdownRenderer = (
  initialRenderer: (text: string) => string = fallbackRender,
  maxSize = DEFAULT_MAX_CACHE_SIZE,
): CachedMarkdownRenderer => {
  let renderer = initialRenderer;
  const cache = new Map<string, string>();

  return {
    setRenderer(nextRenderer) {
      renderer = nextRenderer;
      cache.clear();
    },
    render(text) {
      const cached = cache.get(text);
      if (cached != null) {
        return cached;
      }

      const rendered = renderer(text);
      cache.set(text, rendered);
      trimCache(cache, maxSize);
      return rendered;
    },
    clear() {
      cache.clear();
    },
  };
};

const shouldFlushStreamingMarkdown = (text: string, lastRenderedText: string, minChars: number): boolean => {
  if (!lastRenderedText) return true;
  if (text.length <= lastRenderedText.length) return true;

  const appended = text.slice(lastRenderedText.length);
  if (appended.length >= minChars) return true;
  if (/[\n`]/.test(appended)) return true;
  if (/\n\s*$/.test(text)) return true;
  if (/[。！？.!?：:]\s*$/.test(text)) return true;

  return false;
};

export const createStreamingMarkdownRenderer = (
  initialRenderer: (text: string) => string = fallbackRender,
  options?: { minChars?: number },
): StreamingMarkdownRenderer => {
  let renderer = initialRenderer;
  const minChars = options?.minChars ?? DEFAULT_STREAM_MIN_CHARS;
  let lastText = '';
  let lastHtml = '';
  let lastRenderedText = '';

  return {
    setRenderer(nextRenderer) {
      renderer = nextRenderer;
      lastText = '';
      lastHtml = '';
      lastRenderedText = '';
    },
    render(text, renderOptions) {
      if (text === lastText) {
        return lastHtml;
      }

      const immediate = renderOptions?.immediate ?? false;
      if (immediate || shouldFlushStreamingMarkdown(text, lastRenderedText, minChars)) {
        lastHtml = renderer(text);
        lastRenderedText = text;
      } else if (!lastHtml) {
        lastHtml = fallbackRender(text);
      }

      lastText = text;
      return lastHtml;
    },
    reset() {
      lastText = '';
      lastHtml = '';
      lastRenderedText = '';
    },
  };
};
