import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiRequestError, streamChat, type ChatMessage } from '@/utils/ai';

const sampleMessages: ChatMessage[] = [
  { role: 'user', content: '帮我分析' },
];

const sampleConfig = {
  baseUrl: 'https://api.deepseek.com',
  apiKey: 'test-key',
  model: 'deepseek-chat',
};

describe('streamChat', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('上游在首包前空流结束时会抛出可恢复的 empty_stream 错误', async () => {
    const reader = {
      read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      releaseLock: vi.fn(),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new ReadableStream(), {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'x-request-id': 'req-empty-stream',
      },
    }) as Response);

    vi.spyOn(Response.prototype, 'body', 'get').mockReturnValue({ getReader: () => reader } as ReadableStream<Uint8Array>);

    const consume = async () => {
      for await (const _chunk of streamChat(sampleConfig, sampleMessages)) {
        // noop
      }
    };

    await expect(consume()).rejects.toEqual(expect.objectContaining({
      name: 'AiRequestError',
      details: expect.objectContaining({
        code: 'empty_stream',
        provider: 'api.deepseek.com',
        model: 'deepseek-chat',
        traceId: 'req-empty-stream',
        retryable: true,
      }),
    }));
  });

  it('首包长时间未到时会超时中止，而不是无限卡住', async () => {
    vi.useFakeTimers();

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const signal = init?.signal as AbortSignal | undefined;
      return await new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
      });
    });

    const consumeResultPromise = (async () => {
      try {
        for await (const _chunk of streamChat(sampleConfig, sampleMessages)) {
          // noop
        }
        return null;
      } catch (error) {
        return error;
      }
    })();

    await vi.advanceTimersByTimeAsync(15_100);

    await expect(consumeResultPromise).resolves.toEqual(expect.objectContaining({
      name: 'AiRequestError',
      message: '已发出请求，但长时间未收到首包响应，请稍后重试',
      details: expect.objectContaining({
        code: 'AI_FIRST_PAYLOAD_TIMEOUT',
        provider: 'api.deepseek.com',
        model: 'deepseek-chat',
      }),
    }));
  });

  it('500 响应里的 provider/model/trace id 会被归一化到错误对象；empty_stream 会被识别为可重试错误', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      error: {
        message: 'empty_stream: upstream stream closed before first payload',
        type: 'server_error',
        code: 'internal_server_error',
        trace_id: 'trace-from-body',
      },
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    }));

    const consume = async () => {
      for await (const _chunk of streamChat(sampleConfig, sampleMessages)) {
        // noop
      }
    };

    await expect(consume()).rejects.toMatchObject({
      name: 'AiRequestError',
      details: expect.objectContaining({
        status: 500,
        provider: 'api.deepseek.com',
        model: 'deepseek-chat',
        traceId: 'trace-from-body',
        code: 'empty_stream',
        type: 'server_error',
        retryable: true,
      }),
    });
  });
});
