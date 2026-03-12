/**
 * AI 财务分析工具模块
 * 纯前端直连 OpenAI 兼容 API，支持流式输出 + 思考过程
 */

import type {
    AccountConfig,
    CashFlowEvent,
    AnalyticsSummary,
    DailySnapshot,
    Reconciliation,
    LedgerEntry,
    EventOverride,
} from '@/types';
import { formatLocalISODate } from '@/utils/date';
import { TimelineGenerator } from '@/utils/timeline';
import { AnalyticsEngine } from '@/utils/analytics';
import { aggregateAccountTimelines } from '@/utils/timeline-aggregate';

// ---- 配置管理 ----

export interface AiConfig {
    baseUrl: string;
    apiKey: string;
    model: string;
}

const CONFIG_KEY = 'fm-ai-config';
const CHAT_KEY = 'fm-ai-chat';
const CHAT_DRAFT_KEY = 'fm-ai-draft';
const DEFAULT_AI_MODEL = 'gpt-4o-mini';

export interface ChatHistoryScope {
    accountIds?: string[];
}

const normalizeScopeAccountIds = (accountIds?: string[]): string[] => {
    if (!accountIds?.length) return [];
    return Array.from(new Set(accountIds.map((id) => id.trim()).filter(Boolean))).sort();
};

export const createChatHistoryScopeKey = (scope?: ChatHistoryScope): string => {
    const accountIds = normalizeScopeAccountIds(scope?.accountIds);
    if (!accountIds.length) return CHAT_KEY;
    return `${CHAT_KEY}:${accountIds.join(',')}`;
};

const isPrivateOrUnsafeAiHostname = (hostname: string): boolean => {
    if (!hostname) return true;

    const normalized = hostname.trim().toLowerCase();
    const withoutBrackets = normalized.replace(/^\[(.*)\]$/, '$1');

    const endsWithHost = (host: string) => withoutBrackets === host || withoutBrackets.endsWith(`.${host}`);

    // Block localhost-like special domains that resolve to loopback.
    // These are common bypass vectors when we do not perform DNS resolution.
    if (endsWithHost('lvh.me') || endsWithHost('localtest.me')) {
        return true;
    }

    // Block wildcard IP-to-hostname services.
    // Examples:
    // - 127.0.0.1.nip.io
    // - 127-0-0-1.sslip.io
    const isIpEncodedHost = (suffix: string) => {
        if (!endsWithHost(suffix)) return false;

        const prefix = withoutBrackets.slice(0, -suffix.length).replace(/\.$/, '');
        if (!prefix) return false;

        const parseOctets = (raw: string, delimiter: '.' | '-') => {
            const parts = raw.split(delimiter);
            if (parts.length !== 4) return null;
            const nums = parts.map((p) => Number.parseInt(p, 10));
            if (nums.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return null;
            return nums;
        };

        const octets = prefix.includes('.')
            ? parseOctets(prefix, '.')
            : prefix.includes('-')
                ? parseOctets(prefix, '-')
                : null;
        if (!octets) return false;

        return true;
    };

    if (isIpEncodedHost('nip.io') || isIpEncodedHost('xip.io') || isIpEncodedHost('sslip.io')) {
        return true;
    }

    // Some environments stringify IPv6-mapped IPv4 addresses in a compact hex form,
    // e.g. new URL('http://[::ffff:127.0.0.1]/').hostname === '[::ffff:7f00:1]'.
    // We conservatively block any IPv6 that declares itself as an IPv4-mapped address
    // (including the compact form) to avoid bypassing IPv4 localhost/private checks.
    if (/^::ffff:/i.test(withoutBrackets)) {
        return true;
    }

    if (
        withoutBrackets === 'localhost'
        || withoutBrackets === 'localhost.'
        || withoutBrackets.endsWith('.localhost')
        || withoutBrackets.endsWith('.localhost.')
        || withoutBrackets === '0.0.0.0'
        || withoutBrackets === '::'
        || withoutBrackets === '::1'
    ) {
        return true;
    }

    const isIPv4Literal = (value: string) => {
        if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return false;
        return value.split('.').every((part) => {
            const num = Number.parseInt(part, 10);
            return Number.isFinite(num) && num >= 0 && num <= 255;
        });
    };

    const isIPv6Literal = (value: string) => value.includes(':');

    if (isIPv4Literal(withoutBrackets)) {
        if (
            withoutBrackets.startsWith('127.')
            || withoutBrackets.startsWith('10.')
            || withoutBrackets.startsWith('192.168.')
            || /^172\.(1[6-9]|2\d|3[0-1])\./.test(withoutBrackets)
            || /^169\.254\./.test(withoutBrackets)
            || /^100\.(6[4-9]|[78]\d|9\d|1[01]\d|12[0-7])\./.test(withoutBrackets)
        ) {
            return true;
        }
    }

    // Only apply ULA/link-local checks to IPv6 literals.
    // Avoid blocking normal domain names like "fd.com".
    if (isIPv6Literal(withoutBrackets)) {
        if (/^(fc|fd)[0-9a-f]{0,2}:/i.test(withoutBrackets)) return true;
        if (/^fe[89ab][0-9a-f]{0,2}:/i.test(withoutBrackets)) return true;
    }

    return false;
};

export const isAllowedAiProxyTarget = (targetUrl: string): boolean => {
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(targetUrl);
    } catch {
        return false;
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return false;
    }

    const hostname = parsedUrl.hostname.trim().toLowerCase();
    if (isPrivateOrUnsafeAiHostname(hostname)) {
        return false;
    }

    return parsedUrl.pathname.replace(/\/+$/, '').endsWith('/chat/completions');
};

export const normalizeAiBaseUrl = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) {
        throw new Error('请填写 API 地址');
    }

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(trimmed);
    } catch {
        throw new Error('API 地址格式不正确');
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('API 地址仅支持 http 或 https');
    }

    const hostname = parsedUrl.hostname.trim().toLowerCase();
    if (isPrivateOrUnsafeAiHostname(hostname)) {
        throw new Error(
            'API 地址不安全：禁止 localhost / 内网 IP（含 127.0.0.1、RFC1918、169.254/16、100.64/10、IPv6 ULA/link-local 等）',
        );
    }

    const normalizedPath = parsedUrl.pathname.replace(/\/+$/, '');
    if (normalizedPath.endsWith('/chat/completions')) {
        parsedUrl.pathname = normalizedPath.replace(/\/chat\/completions$/, '');
    } else {
        parsedUrl.pathname = normalizedPath;
    }

    const normalized = parsedUrl.toString().replace(/\/+$/, '');
    const targetUrl = buildAiChatCompletionsUrl(normalized);

    if (!isAllowedAiProxyTarget(targetUrl)) {
        throw new Error('API 地址不受支持，请使用公开的 OpenAI 兼容 /chat/completions 接口');
    }

    return normalized;
};

export const sanitizeAiConfig = (config: AiConfig): AiConfig => {
    const baseUrl = normalizeAiBaseUrl(config.baseUrl);
    const apiKey = config.apiKey.trim();
    const model = config.model.trim() || DEFAULT_AI_MODEL;

    if (!apiKey) {
        throw new Error('请填写 API Key');
    }

    return {
        baseUrl,
        apiKey,
        model,
    };
};

export const buildAiChatCompletionsUrl = (baseUrl: string): string => {
    const normalizedBaseUrl = normalizeAiBaseUrlForTarget(baseUrl);

    // 兼容用户输入已包含 /v1 的情形（例如 https://api.openai.com/v1）
    // 避免拼出 /v1/v1/chat/completions 导致 404。
    if (normalizedBaseUrl.endsWith('/v1')) {
        return `${normalizedBaseUrl}/chat/completions`;
    }

    return `${normalizedBaseUrl}/v1/chat/completions`;
};

const normalizeAiBaseUrlForTarget = (baseUrl: string): string => {
    return baseUrl.trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
};

export const loadAiConfig = (): AiConfig | null => {
    try {
        const raw = localStorage.getItem(CONFIG_KEY);
        if (!raw) return null;
        return sanitizeAiConfig(JSON.parse(raw) as AiConfig);
    } catch {
        return null;
    }
};

export const saveAiConfig = (config: AiConfig) => {
    const sanitized = sanitizeAiConfig(config);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(sanitized));
};

// ---- 对话持久化 ----

export interface ChatRecord {
    id?: string;
    role: 'user' | 'assistant';
    content: string;
    thinking?: string;
}

const createChatRecordId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeChatRecord = (record: ChatRecord): ChatRecord => ({
    ...record,
    id: record.id?.trim() || createChatRecordId(),
});

export const loadChatHistory = (scope?: ChatHistoryScope): ChatRecord[] => {
    try {
        const scopedKey = createChatHistoryScopeKey(scope);
        const raw = localStorage.getItem(scopedKey);
        if (raw) {
            return (JSON.parse(raw) as ChatRecord[]).map(normalizeChatRecord);
        }

        if (scopedKey !== CHAT_KEY) {
            const legacyRaw = localStorage.getItem(CHAT_KEY);
            return legacyRaw ? (JSON.parse(legacyRaw) as ChatRecord[]).map(normalizeChatRecord) : [];
        }

        return [];
    } catch {
        return [];
    }
};

export const saveChatHistory = (messages: ChatRecord[], scope?: ChatHistoryScope) => {
    localStorage.setItem(createChatHistoryScopeKey(scope), JSON.stringify(messages.map(normalizeChatRecord)));
};

export const clearChatHistory = (scope?: ChatHistoryScope) => {
    localStorage.removeItem(createChatHistoryScopeKey(scope));
};

export const createChatDraftScopeKey = (scope?: ChatHistoryScope): string => {
    const accountIds = normalizeScopeAccountIds(scope?.accountIds);
    if (!accountIds.length) return CHAT_DRAFT_KEY;
    return `${CHAT_DRAFT_KEY}:${accountIds.join(',')}`;
};

export const loadChatDraft = (scope?: ChatHistoryScope): string => {
    try {
        const scopedKey = createChatDraftScopeKey(scope);
        const raw = localStorage.getItem(scopedKey);
        if (typeof raw === 'string') {
            return raw;
        }

        if (scopedKey !== CHAT_DRAFT_KEY) {
            return localStorage.getItem(CHAT_DRAFT_KEY) ?? '';
        }

        return '';
    } catch {
        return '';
    }
};

export const saveChatDraft = (draft: string, scope?: ChatHistoryScope) => {
    const scopedKey = createChatDraftScopeKey(scope);
    if (!draft.trim()) {
        localStorage.removeItem(scopedKey);
        return;
    }
    localStorage.setItem(scopedKey, draft);
};

export const clearChatDraft = (scope?: ChatHistoryScope) => {
    localStorage.removeItem(createChatDraftScopeKey(scope));
};

export const exportChatHistory = (messages: ChatRecord[], scope?: ChatHistoryScope) => {
    const text = messages
        .map((m) => {
            const prefix = m.role === 'user' ? '## 提问' : '## 回答';
            const thinking = m.thinking ? `\n<details><summary>思考过程</summary>\n\n${m.thinking}\n</details>\n` : '';
            return `${prefix}\n\n${m.content}${thinking}`;
        })
        .join('\n\n---\n\n');

    const scopedAccountIds = normalizeScopeAccountIds(scope?.accountIds);
    const scopeLabel = scopedAccountIds.length ? `-${scopedAccountIds.join('_')}` : '';

    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `财务分析对话${scopeLabel}-${formatLocalISODate()}.md`;
    a.click();
    URL.revokeObjectURL(url);
};

// ---- Prompt 构建 ----

export interface FinancialContext {
    accounts: AccountConfig[];
    events: CashFlowEvent[];
    analytics: AnalyticsSummary;
    timeline: DailySnapshot[];
    today: string;
    isMultiAccount: boolean;
}

const timelineGenerator = new TimelineGenerator();
const analyticsEngine = new AnalyticsEngine();

export interface BuildScopedFinancialContextInput {
    accounts: AccountConfig[];
    selectedAccountIds: string[];
    events: CashFlowEvent[];
    reconciliations: Reconciliation[];
    ledgerEntries: LedgerEntry[];
    eventOverrides: EventOverride[];
    viewMonths: number;
    today: string;
}

export const buildScopedFinancialContext = (input: BuildScopedFinancialContextInput): FinancialContext => {
    const selectedAccountIds = normalizeScopeAccountIds(input.selectedAccountIds);
    const accounts = input.accounts.filter((account) => selectedAccountIds.includes(account.id));
    const selectedEvents = input.events.filter((event) => selectedAccountIds.includes(event.accountId));

    const timelinesByAccount: Record<string, DailySnapshot[]> = {};

    selectedAccountIds.forEach((accountId) => {
        const reconciliations = input.reconciliations
            .filter((record) => record.accountId === accountId)
            .sort((a, b) => a.date.localeCompare(b.date));

        if (!reconciliations.length) return;

        timelinesByAccount[accountId] = timelineGenerator.generate({
            events: input.events.filter((event) => event.accountId === accountId),
            reconciliations,
            ledgerEntries: input.ledgerEntries.filter((entry) => entry.accountId === accountId),
            eventOverrides: input.eventOverrides.filter((override) => override.accountId === accountId),
            months: input.viewMonths,
            today: input.today,
        });
    });

    const timeline = selectedAccountIds.length > 1
        ? aggregateAccountTimelines(timelinesByAccount, selectedAccountIds)
        : (timelinesByAccount[selectedAccountIds[0]] ?? []);

    const warningThreshold = accounts.reduce((sum, account) => sum + (account.warningThreshold ?? 0), 0);

    return {
        accounts,
        events: selectedEvents,
        analytics: analyticsEngine.generate(timeline, warningThreshold),
        timeline,
        today: input.today,
        isMultiAccount: selectedAccountIds.length > 1,
    };
};

export const buildFinancialSummary = (ctx: FinancialContext): string => {
    const accountNames = ctx.accounts.map((a) => a.name).join('、');

    const accountLines = ctx.accounts
        .map((a) => {
            const parts = [`${a.name}`];
            if (a.typeLabel) parts.push(`（${a.typeLabel}）`);
            parts.push(`，预警阈值 ¥${a.warningThreshold.toLocaleString()}`);
            return `  - ${parts.join('')}`;
        })
        .join('\n');

    const eventLines = ctx.events
        .filter((e) => e.enabled)
        .map((e) => {
            const typeMap: Record<string, string> = {
                once: '一次性',
                monthly: '每月',
                quarterly: '每季度',
                'semi-annual': '每半年',
                yearly: '每年',
            };
            const recurrence = typeMap[e.type] || e.type;
            const sign = e.category === 'income' ? '+' : '-';
            const accName = ctx.accounts.find((a) => a.id === e.accountId)?.name || '';
            return `  - [${recurrence}] ${e.name}: ${sign}¥${e.amount.toLocaleString()}（${accName}，${e.startDate} 起${e.endDate ? `，至 ${e.endDate}` : ''}）`;
        })
        .join('\n');

    const monthLines = ctx.analytics.months
        .map((m) => `  - ${m.monthLabel}: 收入 ¥${m.income.toLocaleString()} / 支出 ¥${m.expense.toLocaleString()} / 结余 ¥${m.net.toLocaleString()}`)
        .join('\n');

    const { extremes } = ctx.analytics;

    return `## 财务数据（${accountNames}）

分析日期: ${ctx.today}
视图: ${ctx.isMultiAccount ? `多账户汇总（${accountNames}）` : `单账户（${accountNames}）`}

### 账户
${accountLines}

### 定期收支事件（已启用）
${eventLines || '  （暂无）'}

### 关键指标
- 期末余额: ¥${ctx.analytics.endingBalance.toLocaleString()}
- 累计收入: ¥${ctx.analytics.totalIncome.toLocaleString()}
- 累计支出: ¥${ctx.analytics.totalExpense.toLocaleString()}
- 最低余额: ¥${extremes.minBalance.toLocaleString()}（${extremes.minDate}）
- 最高余额: ¥${extremes.maxBalance.toLocaleString()}（${extremes.maxDate}）
- 触及预警天数: ${ctx.analytics.warningDates.length} 天${ctx.analytics.warningDates.length > 0 ? `（最早: ${ctx.analytics.warningDates[0]}）` : ''}

### 月度收支
${monthLines}
`;
};

const SYSTEM_PROMPT = `你是一位专业的个人财务分析顾问。用户会提供他们的财务数据，包括具体的账户名称、固定收支事件、月度趋势和关键指标。

请遵循以下原则：
1. 在分析中明确引用具体的账户名称和事件名称，不要泛泛而谈
2. 引用实际数据来支撑每一条结论
3. 指出潜在风险（如余额低于预警线的具体时间点）
4. 给出可操作的改善建议，具体到哪个账户的哪类支出
5. 用 Markdown 格式组织回答，层次清晰
6. 语言简洁直接`;

// ---- 流式 API 调用 ----

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface StreamChunk {
    type: 'content' | 'thinking';
    text: string;
}

export interface AiRequestErrorDetails {
    status?: number;
    provider: string;
    model: string;
    traceId?: string;
    code?: string;
    type?: string;
    retryable: boolean;
}

export class AiRequestError extends Error {
    details: AiRequestErrorDetails;

    constructor(message: string, details: AiRequestErrorDetails) {
        super(message);
        this.name = 'AiRequestError';
        this.details = details;
    }
}

const AI_STREAM_FIRST_PAYLOAD_TIMEOUT_MS = 15_000;
const AI_STREAM_TOTAL_TIMEOUT_MS = 120_000;

const getAiProviderLabel = (baseUrl: string): string => {
    try {
        return new URL(baseUrl).hostname || 'unknown';
    } catch {
        return 'unknown';
    }
};

const getTraceIdFromHeaders = (headers: Headers): string | undefined => {
    const traceHeaderNames = [
        'x-trace-id',
        'trace-id',
        'x-request-id',
        'request-id',
        'anthropic-request-id',
        'openai-request-id',
        'x-openai-request-id',
        'cf-ray',
        'traceparent',
    ];

    for (const name of traceHeaderNames) {
        const value = headers.get(name)?.trim();
        if (value) return value;
    }

    return undefined;
};

const parseJsonSafely = (input: string): unknown => {
    try {
        return JSON.parse(input);
    } catch {
        return null;
    }
};

const normalizeServerErrorPayload = (rawText: string, headers: Headers) => {
    const parsed = parseJsonSafely(rawText) as Record<string, any> | null;
    const nestedError = parsed?.error && typeof parsed.error === 'object' ? parsed.error : null;
    const message = nestedError?.message || parsed?.message || rawText;
    const code = nestedError?.code || parsed?.code;
    const type = nestedError?.type || parsed?.type;
    const traceId = nestedError?.trace_id || nestedError?.traceId || parsed?.trace_id || parsed?.traceId || getTraceIdFromHeaders(headers);

    return {
        message: typeof message === 'string' && message.trim() ? message.trim() : rawText,
        code: typeof code === 'string' ? code : undefined,
        type: typeof type === 'string' ? type : undefined,
        traceId: typeof traceId === 'string' ? traceId : undefined,
    };
};

const buildAiRequestError = (
    message: string,
    config: AiConfig,
    extra?: Partial<AiRequestErrorDetails>,
): AiRequestError => new AiRequestError(message, {
    provider: getAiProviderLabel(config.baseUrl),
    model: config.model.trim() || DEFAULT_AI_MODEL,
    retryable: true,
    ...extra,
});

const composeAbortSignal = (signals: Array<AbortSignal | undefined>): AbortSignal => {
    const controller = new AbortController();
    const cleanups: Array<() => void> = [];

    const abortFromSignal = (signal: AbortSignal) => {
        if (controller.signal.aborted) return;
        controller.abort(signal.reason);
        cleanups.splice(0).forEach((cleanup) => cleanup());
    };

    for (const signal of signals) {
        if (!signal) continue;
        if (signal.aborted) {
            abortFromSignal(signal);
            break;
        }
        const onAbort = () => abortFromSignal(signal);
        signal.addEventListener('abort', onAbort, { once: true });
        cleanups.push(() => signal.removeEventListener('abort', onAbort));
    }

    return controller.signal;
};

const createTimeoutSignal = (timeoutMs: number, reason: string) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
        controller.abort(new DOMException(reason, 'TimeoutError'));
    }, timeoutMs);

    return {
        signal: controller.signal,
        dispose: () => window.clearTimeout(timer),
    };
};

const isTimeoutAbort = (error: unknown): boolean => {
    return error instanceof DOMException && error.name === 'TimeoutError';
};

const getRecoverableStreamFailureMessage = (errorMessage: string): string => {
    if (errorMessage.includes('empty_stream')) {
        return '上游流式连接在返回首包前断开，请重试';
    }
    return errorMessage;
};

export async function* streamChat(
    config: AiConfig,
    messages: ChatMessage[],
    options?: { signal?: AbortSignal },
): AsyncGenerator<StreamChunk, void, unknown> {
    const sanitizedConfig = sanitizeAiConfig(config);
    const targetUrl = buildAiChatCompletionsUrl(sanitizedConfig.baseUrl);
    const firstPayloadTimeout = createTimeoutSignal(AI_STREAM_FIRST_PAYLOAD_TIMEOUT_MS, 'AI_FIRST_PAYLOAD_TIMEOUT');
    const totalTimeout = createTimeoutSignal(AI_STREAM_TOTAL_TIMEOUT_MS, 'AI_TOTAL_TIMEOUT');
    const signal = composeAbortSignal([options?.signal, firstPayloadTimeout.signal, totalTimeout.signal]);

    let response: Response;
    try {
        response = await fetch('/api/ai-proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Target-Url': targetUrl,
                'X-Auth': `Bearer ${sanitizedConfig.apiKey}`,
            },
            body: JSON.stringify({
                model: sanitizedConfig.model,
                messages,
                stream: true,
                temperature: 0.7,
            }),
            signal,
        });
    } catch (error) {
        firstPayloadTimeout.dispose();
        totalTimeout.dispose();

        if (options?.signal?.aborted) {
            throw error;
        }

        if (isTimeoutAbort(signal.reason)) {
            const timeoutMessage = signal.reason.message === 'AI_TOTAL_TIMEOUT'
                ? '分析超时，已自动停止本次请求，请稍后重试'
                : '已发出请求，但长时间未收到首包响应，请稍后重试';
            throw buildAiRequestError(timeoutMessage, sanitizedConfig, { code: signal.reason.message });
        }

        throw buildAiRequestError(`请求失败: ${error instanceof Error ? error.message : '网络异常'}`, sanitizedConfig, {
            type: error instanceof Error ? error.name : undefined,
        });
    }

    if (!response.ok) {
        firstPayloadTimeout.dispose();
        totalTimeout.dispose();
        const errorText = await response.text();
        const normalizedError = normalizeServerErrorPayload(errorText, response.headers);
        throw buildAiRequestError(
            `API 请求失败 (${response.status}): ${getRecoverableStreamFailureMessage(normalizedError.message)}`,
            sanitizedConfig,
            {
                status: response.status,
                traceId: normalizedError.traceId,
                code: normalizedError.code,
                type: normalizedError.type,
                retryable: response.status >= 500 || normalizedError.code === 'empty_stream',
            },
        );
    }

    const reader = response.body?.getReader();
    if (!reader) {
        firstPayloadTimeout.dispose();
        totalTimeout.dispose();
        throw buildAiRequestError('无法读取响应流', sanitizedConfig, {
            traceId: getTraceIdFromHeaders(response.headers),
            retryable: true,
        });
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let receivedFirstPayload = false;

    const consumeSseLine = (line: string): StreamChunk[] => {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) return [];

        const data = trimmed.slice(6);
        if (data === '[DONE]') {
            return [];
        }

        try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            if (!delta) return [];

            const chunks: StreamChunk[] = [];
            if (delta.reasoning_content) {
                chunks.push({ type: 'thinking', text: delta.reasoning_content });
            }
            if (delta.content) {
                chunks.push({ type: 'content', text: delta.content });
            }
            if (chunks.length) {
                receivedFirstPayload = true;
                firstPayloadTimeout.dispose();
            }
            return chunks;
        } catch {
            return [];
        }
    };

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                buffer += decoder.decode();
                const lines = buffer.split('\n');
                for (const line of lines) {
                    for (const chunk of consumeSseLine(line)) {
                        yield chunk;
                    }
                }

                if (!receivedFirstPayload) {
                    throw buildAiRequestError('API 请求失败 (500): 上游流式连接在返回首包前断开，请重试', sanitizedConfig, {
                        status: response.status || 500,
                        traceId: getTraceIdFromHeaders(response.headers),
                        code: 'empty_stream',
                        type: 'server_error',
                        retryable: true,
                    });
                }
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                for (const chunk of consumeSseLine(line)) {
                    yield chunk;
                }
            }
        }
    } catch (error) {
        if (options?.signal?.aborted) {
            throw error;
        }

        if (isTimeoutAbort(signal.reason)) {
            const timeoutMessage = signal.reason.message === 'AI_TOTAL_TIMEOUT'
                ? '分析超时，已自动停止本次请求，请稍后重试'
                : '已发出请求，但长时间未收到首包响应，请稍后重试';
            throw buildAiRequestError(timeoutMessage, sanitizedConfig, {
                traceId: getTraceIdFromHeaders(response.headers),
                code: signal.reason.message,
            });
        }

        throw error;
    } finally {
        firstPayloadTimeout.dispose();
        totalTimeout.dispose();
        reader.releaseLock();
    }
}

export const createAnalysisMessages = (
    financialSummary: string,
    userQuestion?: string,
): ChatMessage[] => {
    return [
        { role: 'system', content: SYSTEM_PROMPT },
        {
            role: 'user',
            content: userQuestion
                ? `以下是我的财务数据：\n\n${financialSummary}\n\n我的问题：${userQuestion}`
                : `请基于以下数据做一份财务分析，要求：\n1. 明确标注你分析的是哪个账户\n2. 整体收支健康度评估\n3. 风险预警（余额低于阈值的时间点）\n4. 针对具体支出项的优化建议\n\n${financialSummary}`,
        },
    ];
};
