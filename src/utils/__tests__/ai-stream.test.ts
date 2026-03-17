import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiRequestError, streamChat, streamChatWithRecovery, type ChatMessage } from '@/utils/ai';

const sampleMessages: ChatMessage[] = [
  { role: 'user', content: '帮我分析' },
];

const sampleConfig = {
  baseUrl: 'https://api.deepseek.com',
  apiKey: 'test-key',
  model: 'deepseek-chat',
};

describe('streamChat / streamChatWithRecovery', () => {
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

  it('stream=true 但上游直接返回非流式 JSON 时，会直接提取完整结果而不是误判 empty_stream', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: '代理直接回了完整结果',
            reasoning_content: '这是上游直接返回的推理摘要',
          },
        },
      ],
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': 'trace-json-success',
      },
    }));

    const chunks: Array<{ type: string; text: string }> = [];
    for await (const chunk of streamChat(sampleConfig, sampleMessages)) {
      chunks.push(chunk);
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(chunks).toEqual([
      { type: 'thinking', text: '这是上游直接返回的推理摘要' },
      { type: 'content', text: '代理直接回了完整结果' },
    ]);
  });

  it('empty_stream 时会按指数退避自动重试，并在后续流式成功时返回完整结果', async () => {
    vi.useFakeTimers();

    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const emptyReader = {
      read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      releaseLock: vi.fn(),
    };
    const successReader = {
      read: vi.fn()
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"恢复成功"}}]}\n\n') })
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: [DONE]\n\n') })
        .mockResolvedValueOnce({ done: true, value: undefined }),
      releaseLock: vi.fn(),
    };

    fetchMock
      .mockResolvedValueOnce(new Response(new ReadableStream(), {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'x-request-id': 'trace-retry-1',
        },
      }) as Response)
      .mockResolvedValueOnce(new Response(new ReadableStream(), {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'x-request-id': 'trace-retry-2',
        },
      }) as Response);

    vi.spyOn(Response.prototype, 'body', 'get')
      .mockReturnValueOnce({ getReader: () => emptyReader } as ReadableStream<Uint8Array>)
      .mockReturnValueOnce({ getReader: () => successReader } as ReadableStream<Uint8Array>);

    const resultPromise = streamChatWithRecovery(sampleConfig, sampleMessages);
    await vi.advanceTimersByTimeAsync(300);
    const result = await resultPromise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      content: '恢复成功',
      retries: 1,
      downgraded: false,
      diagnostics: expect.objectContaining({
        provider: 'api.deepseek.com',
        model: 'deepseek-chat',
        retries: 1,
      }),
    });
  });

  it('首包前流读取直接报错时，也会归一化为 empty_stream 并自动重试成功', async () => {
    vi.useFakeTimers();

    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const brokenReader = {
      read: vi.fn().mockRejectedValue(new Error('upstream stream closed before first payload')),
      releaseLock: vi.fn(),
    };
    const successReader = {
      read: vi.fn()
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"读流报错后恢复成功"}}]}\n\n') })
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: [DONE]\n\n') })
        .mockResolvedValueOnce({ done: true, value: undefined }),
      releaseLock: vi.fn(),
    };

    fetchMock
      .mockResolvedValueOnce(new Response(new ReadableStream(), {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'x-request-id': 'trace-read-error-1',
        },
      }) as Response)
      .mockResolvedValueOnce(new Response(new ReadableStream(), {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'x-request-id': 'trace-read-error-2',
        },
      }) as Response);

    vi.spyOn(Response.prototype, 'body', 'get')
      .mockReturnValueOnce({ getReader: () => brokenReader } as ReadableStream<Uint8Array>)
      .mockReturnValueOnce({ getReader: () => successReader } as ReadableStream<Uint8Array>);

    const resultPromise = streamChatWithRecovery(sampleConfig, sampleMessages);
    await vi.advanceTimersByTimeAsync(300);
    const result = await resultPromise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      content: '读流报错后恢复成功',
      retries: 1,
      downgraded: false,
      diagnostics: expect.objectContaining({
        provider: 'api.deepseek.com',
        model: 'deepseek-chat',
        retries: 1,
      }),
    });
  });

  it('empty_stream 重试耗尽后会自动降级为非流式补拉，并记录降级诊断', async () => {
    vi.useFakeTimers();

    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const emptyReaderA = {
      read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      releaseLock: vi.fn(),
    };
    const emptyReaderB = {
      read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      releaseLock: vi.fn(),
    };
    const emptyReaderC = {
      read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      releaseLock: vi.fn(),
    };

    fetchMock
      .mockResolvedValueOnce(new Response(new ReadableStream(), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'x-request-id': 'trace-empty-a' },
      }) as Response)
      .mockResolvedValueOnce(new Response(new ReadableStream(), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'x-request-id': 'trace-empty-b' },
      }) as Response)
      .mockResolvedValueOnce(new Response(new ReadableStream(), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'x-request-id': 'trace-empty-c' },
      }) as Response)
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [
          {
            message: {
              content: '非流式补拉成功',
            },
          },
        ],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'x-request-id': 'trace-fallback' },
      }));

    vi.spyOn(Response.prototype, 'body', 'get')
      .mockReturnValueOnce({ getReader: () => emptyReaderA } as ReadableStream<Uint8Array>)
      .mockReturnValueOnce({ getReader: () => emptyReaderB } as ReadableStream<Uint8Array>)
      .mockReturnValueOnce({ getReader: () => emptyReaderC } as ReadableStream<Uint8Array>);

    const resultPromise = streamChatWithRecovery({ ...sampleConfig, model: 'gpt-5.4' }, sampleMessages);
    await vi.advanceTimersByTimeAsync(300 + 800);
    const result = await resultPromise;

    expect(fetchMock).toHaveBeenCalledTimes(4);
    const fallbackCall = fetchMock.mock.calls[3];
    expect(JSON.parse(String(fallbackCall?.[1]?.body))).toMatchObject({
      model: 'gpt-5.2',
      stream: false,
    });
    expect(result).toMatchObject({
      content: '非流式补拉成功',
      retries: 2,
      downgraded: true,
      diagnostics: expect.objectContaining({
        traceId: 'trace-fallback',
        retries: 2,
        downgradedFromModel: 'gpt-5.4',
        downgradedToModel: 'gpt-5.2',
        downgradeStrategy: 'model-fallback',
      }),
    });
  });

  it('empty_stream 重试与降级都失败时，会抛出带 httpStatus/traceId/retries 的可恢复错误', async () => {
    vi.useFakeTimers();

    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const emptyReaderA = {
      read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      releaseLock: vi.fn(),
    };
    const emptyReaderB = {
      read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      releaseLock: vi.fn(),
    };
    const emptyReaderC = {
      read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      releaseLock: vi.fn(),
    };

    fetchMock
      .mockResolvedValueOnce(new Response(new ReadableStream(), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'x-request-id': 'trace-empty-a' },
      }) as Response)
      .mockResolvedValueOnce(new Response(new ReadableStream(), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'x-request-id': 'trace-empty-b' },
      }) as Response)
      .mockResolvedValueOnce(new Response(new ReadableStream(), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'x-request-id': 'trace-empty-c' },
      }) as Response)
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: {
          message: 'empty_stream: upstream stream closed before first payload',
          type: 'server_error',
          trace_id: 'trace-fallback-failed',
        },
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }));

    vi.spyOn(Response.prototype, 'body', 'get')
      .mockReturnValueOnce({ getReader: () => emptyReaderA } as ReadableStream<Uint8Array>)
      .mockReturnValueOnce({ getReader: () => emptyReaderB } as ReadableStream<Uint8Array>)
      .mockReturnValueOnce({ getReader: () => emptyReaderC } as ReadableStream<Uint8Array>);

    const resultPromise = streamChatWithRecovery({ ...sampleConfig, model: 'gpt-5.4' }, sampleMessages);
    const rejectionExpectation = expect(resultPromise).rejects.toMatchObject({
      name: 'AiRequestError',
      details: expect.objectContaining({
        status: 500,
        traceId: 'trace-fallback-failed',
        code: 'empty_stream',
        retries: 2,
        downgradedFromModel: 'gpt-5.4',
        downgradedToModel: 'gpt-5.2',
        downgradeStrategy: 'model-fallback',
      }),
    });

    await vi.advanceTimersByTimeAsync(300 + 800);
    await rejectionExpectation;
  });
});
