/**
 * Cloudflare Pages Function: AI API CORS 代理
 * 路径: /api/ai-proxy (POST)
 *
 * 前端通过 Headers 传递目标 URL 和认证信息，
 * 由 Cloudflare Worker 在服务端转发请求，绕过浏览器 CORS 限制。
 */

interface Env { }

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

    try {
        const proxyHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (auth) {
            proxyHeaders['Authorization'] = auth;
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
