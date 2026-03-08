import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestOptions, onRequestPost } from '../ai-proxy';

describe('Cloudflare ai-proxy function', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('缺少目标 header 时返回 400', async () => {
    const request = new Request('http://localhost/api/ai-proxy', {
      method: 'POST',
      body: JSON.stringify({ model: 'gpt-4o-mini' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await onRequestPost({ request });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Missing X-Target-Url header' });
  });

  it('拒绝 localhost / 内网等不安全目标', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const request = new Request('http://localhost/api/ai-proxy', {
      method: 'POST',
      body: JSON.stringify({ model: 'gpt-4o-mini' }),
      headers: {
        'Content-Type': 'application/json',
        'X-Target-Url': 'http://127.0.0.1:11434/v1/chat/completions',
      },
    });

    const response = await onRequestPost({ request });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Blocked unsafe proxy target' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('透传授权头与上游响应', async () => {
    const upstreamHeaders = new Headers({ 'Content-Type': 'text/event-stream' });
    const upstreamResponse = new Response('data: ok\n\n', {
      status: 200,
      headers: upstreamHeaders,
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(upstreamResponse);

    const request = new Request('http://localhost/api/ai-proxy', {
      method: 'POST',
      body: JSON.stringify({ model: 'gpt-4o-mini', stream: true }),
      headers: {
        'Content-Type': 'application/json',
        'X-Target-Url': 'https://api.openai.com/v1/chat/completions',
        'X-Auth': 'Bearer secret-token',
      },
    });

    const response = await onRequestPost({ request });
    const forwarded = fetchSpy.mock.calls[0]?.[1] as RequestInit;

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer secret-token',
        },
      }),
    );
    expect(forwarded.body).toBeTruthy();
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    await expect(response.text()).resolves.toBe('data: ok\n\n');
  });

  it('上游异常时返回 502', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    const request = new Request('http://localhost/api/ai-proxy', {
      method: 'POST',
      body: JSON.stringify({ model: 'gpt-4o-mini' }),
      headers: {
        'Content-Type': 'application/json',
        'X-Target-Url': 'https://api.openai.com/v1/chat/completions',
      },
    });

    const response = await onRequestPost({ request });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: 'Proxy error: network down' });
  });

  it('OPTIONS 预检返回允许跨域头', async () => {
    const response = await onRequestOptions();

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('*');
  });
});
