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

        const controller = new AbortController();
        const timeoutMs = 60_000;
        const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const proxyRes = await fetch(targetUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authorization ? { Authorization: authorization } : {}),
            },
            body,
            signal: controller.signal,
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
          res.end(
            JSON.stringify({
              error: `Proxy error: ${err?.name === 'AbortError' ? 'Request aborted (timeout)' : err.message}`,
            }),
          );
        } finally {
          clearTimeout(timeoutTimer);
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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/utils/echarts-balance.ts')) {
            return 'chart-balance-runtime';
          }

          if (id.includes('/src/utils/echarts-cashflow.ts')) {
            return 'chart-cashflow-runtime';
          }

          if (!id.includes('node_modules')) return;

          // Charts: keep vue-echarts separate so it doesn't pull the whole ECharts runtime
          // into the initial chart component chunk.
          if (id.includes('/vue-echarts/')) {
            return 'vendor-vue-echarts';
          }

          // ECharts is modular. We keep the shared core (echarts/core + zrender) in a vendor chunk,
          // but let `echarts/lib/*` installers stay with the lazily-loaded chart runtime chunks.
          if (id.includes('/zrender/')) {
            return 'vendor-charts';
          }

          if (id.includes('/echarts/lib/')) {
            return;
          }

          if (id.includes('/echarts/')) {
            return 'vendor-charts';
          }

          if (id.includes('/vue/') || id.includes('/@vue/') || id.includes('pinia')) {
            return 'vendor-vue';
          }

          if (id.includes('markdown-it')) {
            return 'vendor-markdown';
          }

          if (id.includes('date-fns')) {
            return 'vendor-date';
          }

          // NOTE: Avoid splitting dayjs out of vendor-antd.
          // ant-design-vue imports dayjs internally, and forcing it into its own chunk can trigger
          // Rollup circular chunk warnings (vendor-dayjs <-> vendor-antd).
          // Keep it in vendor-antd for now.
          if (id.includes('dayjs')) {
            return 'vendor-antd';
          }

          if (id.includes('/@babel/runtime/')) {
            // ant-design-vue ships helpers via @babel/runtime; splitting avoids bloating vendor-antd
            return 'vendor-babel-runtime';
          }

          if (id.includes('async-validator')) {
            // used by antd Form
            return 'vendor-async-validator';
          }

          if (id.includes('/lodash-es/')) {
            // many small ESM imports used by antd
            return 'vendor-lodash-es';
          }

          if (id.includes('/@ctrl/tinycolor/')) {
            return 'vendor-tinycolor';
          }

          if (id.includes('/@ant-design/colors/')) {
            return 'vendor-antd-colors';
          }

          if (id.includes('/@ant-design/icons-vue/') || id.includes('/@ant-design/icons-svg/')) {
            return 'vendor-antd-icons';
          }

          if (id.includes('/ant-design-vue/')) {
            // ant-design-vue has a lot of cross-component internal imports.
            // Splitting by component can trigger Rollup circular chunk warnings, so keep it together.
            return 'vendor-antd';
          }
        },
      },
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
