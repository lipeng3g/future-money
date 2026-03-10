/**
 * Cloudflare Pages Function: AI API CORS 代理
 * 路径: /api/ai-proxy (POST)
 *
 * 前端通过 Headers 传递目标 URL 和认证信息，
 * 由 Cloudflare Worker 在服务端转发请求，绕过浏览器 CORS 限制。
 */

interface Env { }

type ProxyFunctionContext = {
    request: Request;
};

const isPrivateOrUnsafeAiHostname = (hostname: string): boolean => {
    if (!hostname) return true;

    const normalized = hostname.trim().toLowerCase();
    const withoutBrackets = normalized.replace(/^\[(.*)\]$/, '$1');

    // Cloudflare / URL parsing may normalize IPv6-mapped IPv4 into a compact hex form,
    // e.g. [::ffff:7f00:1]. Block any IPv6-mapped IPv4 to prevent bypassing IPv4 checks.
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
        || withoutBrackets.startsWith('127.')
        || withoutBrackets.startsWith('10.')
        || withoutBrackets.startsWith('192.168.')
        || /^172\.(1[6-9]|2\d|3[0-1])\./.test(withoutBrackets)
        || /^169\.254\./.test(withoutBrackets)
        || /^100\.(6[4-9]|[78]\d|9\d|1[01]\d|12[0-7])\./.test(withoutBrackets)
        || /^fc/i.test(withoutBrackets)
        || /^fd/i.test(withoutBrackets)
        || /^fe[89ab]/i.test(withoutBrackets)
    ) {
        return true;
    }

    return false;
};

const isAllowedAiProxyTarget = (targetUrl: string): boolean => {
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

export const onRequestPost = async (context: ProxyFunctionContext) => {
    const request = context.request;

    const targetUrl = request.headers.get('X-Target-Url');
    const auth = request.headers.get('X-Auth');

    if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'Missing X-Target-Url header' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    if (!isAllowedAiProxyTarget(targetUrl)) {
        return new Response(JSON.stringify({ error: 'Blocked unsafe proxy target' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const proxyHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (auth) {
            proxyHeaders.Authorization = auth;
        }

        const proxyRes = await fetch(targetUrl, {
            method: 'POST',
            headers: proxyHeaders,
            body: request.body,
        });

        // 流式转发响应
        return new Response(proxyRes.body, {
            status: proxyRes.status,
            headers: {
                'Content-Type': proxyRes.headers.get('Content-Type') || 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: `Proxy error: ${err.message}` }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

// 处理 CORS 预检请求
export const onRequestOptions = async () => {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': '*',
        },
    });
};
