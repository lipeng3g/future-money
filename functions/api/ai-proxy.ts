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
