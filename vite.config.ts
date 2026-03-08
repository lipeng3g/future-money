import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import type { Plugin } from 'vite';

/**
 * Vite 插件：AI API CORS 代理
 * 前端 POST /api/ai-proxy，通过 Header 传递真实目标 URL
 * 服务端转发请求，解决浏览器跨域限制
 */
function aiProxyPlugin(): Plugin {
  return {
    name: 'ai-cors-proxy',
    configureServer(server) {
      server.middlewares.use('/api/ai-proxy', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': '*',
          });
          res.end();
          return;
        }

        const targetUrl = req.headers['x-target-url'] as string;
        const authorization = req.headers['x-auth'] as string;

        if (!targetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing X-Target-Url header' }));
          return;
        }

        let parsedUrl: URL;
        try {
          parsedUrl = new URL(targetUrl);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid target URL' }));
          return;
        }

        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unsupported target protocol' }));
          return;
        }

        const normalizedPath = parsedUrl.pathname.replace(/\/+$/, '');
        if (!normalizedPath.endsWith('/chat/completions')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Only OpenAI-compatible chat completions endpoints are allowed' }));
          return;
        }

        // 读取请求体
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        const body = Buffer.concat(chunks);

        try {
          const proxyRes = await fetch(targetUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authorization ? { Authorization: authorization } : {}),
            },
            body,
          });

          // 转发响应头
          res.writeHead(proxyRes.status, {
            'Content-Type': proxyRes.headers.get('Content-Type') || 'text/event-stream',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
          });

          // 流式转发响应体
          if (proxyRes.body) {
            const reader = proxyRes.body.getReader();
            const push = async () => {
              while (true) {
                const { done, value } = await reader.read();
                if (done) { res.end(); break; }
                res.write(value);
              }
            };
            push();
          } else {
            const text = await proxyRes.text();
            res.end(text);
          }
        } catch (err: any) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Proxy error: ${err.message}` }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [vue(), aiProxyPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
