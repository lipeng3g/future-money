/**
 * Cloudflare Pages Function: AI API CORS 代理
 * 路径: /api/ai-proxy (POST)
 *
 * 前端通过 Headers 传递目标 URL 和认证信息，
 * 由 Cloudflare Worker 在服务端转发请求，绕过浏览器 CORS 限制。
 */

interface Env { }

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
    if (!hostname) return false;

    if (
        hostname === 'localhost'
        || hostname.endsWith('.localhost')
        || hostname === '0.0.0.0'
        || hostname === '127.0.0.1'
        || hostname === '::1'
        || hostname.startsWith('127.')
        || hostname.startsWith('10.')
        || hostname.startsWith('192.168.')
        || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    ) {
        return false;
    }

    return parsedUrl.pathname.replace(/\/+$/, '').endsWith('/chat/completions');
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
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
export const onRequestOptions: PagesFunction<Env> = async () => {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': '*',
        },
    });
};
