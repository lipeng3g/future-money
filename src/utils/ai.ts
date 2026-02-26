/**
 * AI 财务分析工具模块
 * 纯前端直连 OpenAI 兼容 API，支持流式输出 + 思考过程
 */

import type { AccountConfig, CashFlowEvent, AnalyticsSummary, DailySnapshot } from '@/types';

// ---- 配置管理 ----

export interface AiConfig {
    baseUrl: string;
    apiKey: string;
    model: string;
}

const CONFIG_KEY = 'fm-ai-config';
const CHAT_KEY = 'fm-ai-chat';

export const loadAiConfig = (): AiConfig | null => {
    try {
        const raw = localStorage.getItem(CONFIG_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const saveAiConfig = (config: AiConfig) => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
};

// ---- 对话持久化 ----

export interface ChatRecord {
    role: 'user' | 'assistant';
    content: string;
    thinking?: string;
}

export const loadChatHistory = (): ChatRecord[] => {
    try {
        const raw = localStorage.getItem(CHAT_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const saveChatHistory = (messages: ChatRecord[]) => {
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
};

export const clearChatHistory = () => {
    localStorage.removeItem(CHAT_KEY);
};

export const exportChatHistory = (messages: ChatRecord[]) => {
    const text = messages
        .map((m) => {
            const prefix = m.role === 'user' ? '## 提问' : '## 回答';
            const thinking = m.thinking ? `\n<details><summary>思考过程</summary>\n\n${m.thinking}\n</details>\n` : '';
            return `${prefix}\n\n${m.content}${thinking}`;
        })
        .join('\n\n---\n\n');

    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `财务分析对话-${new Date().toISOString().slice(0, 10)}.md`;
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

export async function* streamChat(
    config: AiConfig,
    messages: ChatMessage[],
): AsyncGenerator<StreamChunk, void, unknown> {
    const targetUrl = `${config.baseUrl.replace(/\/+$/, '')}/v1/chat/completions`;

    const response = await fetch('/api/ai-proxy', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Target-Url': targetUrl,
            'X-Auth': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
            model: config.model,
            messages,
            stream: true,
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('无法读取响应流');

    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') return;
            try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;
                if (!delta) continue;

                // 支持 reasoning_content（DeepSeek 等模型的思考过程）
                if (delta.reasoning_content) {
                    yield { type: 'thinking', text: delta.reasoning_content };
                }
                if (delta.content) {
                    yield { type: 'content', text: delta.content };
                }
            } catch {
                // skip
            }
        }
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
