var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
/**
 * Vite 插件：AI API CORS 代理
 * 前端 POST /api/ai-proxy，通过 Header 传递真实目标 URL
 * 服务端转发请求，解决浏览器跨域限制
 */
function aiProxyPlugin() {
    return {
        name: 'ai-cors-proxy',
        configureServer: function (server) {
            var _this = this;
            server.middlewares.use('/api/ai-proxy', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var targetUrl, authorization, parsedUrl, normalizedPath, chunks, chunk, e_1_1, body, proxyRes, reader_1, push, text, err_1;
                var _this = this;
                var _a, req_1, req_1_1;
                var _b, e_1, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            if (req.method === 'OPTIONS') {
                                res.writeHead(204, {
                                    'Access-Control-Allow-Origin': '*',
                                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                                    'Access-Control-Allow-Headers': '*',
                                });
                                res.end();
                                return [2 /*return*/];
                            }
                            targetUrl = req.headers['x-target-url'];
                            authorization = req.headers['x-auth'];
                            if (!targetUrl) {
                                res.writeHead(400, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'Missing X-Target-Url header' }));
                                return [2 /*return*/];
                            }
                            try {
                                parsedUrl = new URL(targetUrl);
                            }
                            catch (_f) {
                                res.writeHead(400, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'Invalid target URL' }));
                                return [2 /*return*/];
                            }
                            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                                res.writeHead(400, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'Unsupported target protocol' }));
                                return [2 /*return*/];
                            }
                            normalizedPath = parsedUrl.pathname.replace(/\/+$/, '');
                            if (!normalizedPath.endsWith('/chat/completions')) {
                                res.writeHead(400, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'Only OpenAI-compatible chat completions endpoints are allowed' }));
                                return [2 /*return*/];
                            }
                            chunks = [];
                            _e.label = 1;
                        case 1:
                            _e.trys.push([1, 6, 7, 12]);
                            _a = true, req_1 = __asyncValues(req);
                            _e.label = 2;
                        case 2: return [4 /*yield*/, req_1.next()];
                        case 3:
                            if (!(req_1_1 = _e.sent(), _b = req_1_1.done, !_b)) return [3 /*break*/, 5];
                            _d = req_1_1.value;
                            _a = false;
                            chunk = _d;
                            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
                            _e.label = 4;
                        case 4:
                            _a = true;
                            return [3 /*break*/, 2];
                        case 5: return [3 /*break*/, 12];
                        case 6:
                            e_1_1 = _e.sent();
                            e_1 = { error: e_1_1 };
                            return [3 /*break*/, 12];
                        case 7:
                            _e.trys.push([7, , 10, 11]);
                            if (!(!_a && !_b && (_c = req_1.return))) return [3 /*break*/, 9];
                            return [4 /*yield*/, _c.call(req_1)];
                        case 8:
                            _e.sent();
                            _e.label = 9;
                        case 9: return [3 /*break*/, 11];
                        case 10:
                            if (e_1) throw e_1.error;
                            return [7 /*endfinally*/];
                        case 11: return [7 /*endfinally*/];
                        case 12:
                            body = Buffer.concat(chunks);
                            _e.label = 13;
                        case 13:
                            _e.trys.push([13, 18, , 19]);
                            return [4 /*yield*/, fetch(targetUrl, {
                                    method: 'POST',
                                    headers: __assign({ 'Content-Type': 'application/json' }, (authorization ? { Authorization: authorization } : {})),
                                    body: body,
                                })];
                        case 14:
                            proxyRes = _e.sent();
                            // 转发响应头
                            res.writeHead(proxyRes.status, {
                                'Content-Type': proxyRes.headers.get('Content-Type') || 'text/event-stream',
                                'Access-Control-Allow-Origin': '*',
                                'Cache-Control': 'no-cache',
                            });
                            if (!proxyRes.body) return [3 /*break*/, 15];
                            reader_1 = proxyRes.body.getReader();
                            push = function () { return __awaiter(_this, void 0, void 0, function () {
                                var _a, done, value;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            if (!true) return [3 /*break*/, 2];
                                            return [4 /*yield*/, reader_1.read()];
                                        case 1:
                                            _a = _b.sent(), done = _a.done, value = _a.value;
                                            if (done) {
                                                res.end();
                                                return [3 /*break*/, 2];
                                            }
                                            res.write(value);
                                            return [3 /*break*/, 0];
                                        case 2: return [2 /*return*/];
                                    }
                                });
                            }); };
                            push();
                            return [3 /*break*/, 17];
                        case 15: return [4 /*yield*/, proxyRes.text()];
                        case 16:
                            text = _e.sent();
                            res.end(text);
                            _e.label = 17;
                        case 17: return [3 /*break*/, 19];
                        case 18:
                            err_1 = _e.sent();
                            res.writeHead(502, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: "Proxy error: ".concat(err_1.message) }));
                            return [3 /*break*/, 19];
                        case 19: return [2 /*return*/];
                    }
                });
            }); });
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
                manualChunks: function (id) {
                    if (!id.includes('node_modules'))
                        return;
                    if (id.includes('ant-design-vue')) {
                        return 'vendor-antd';
                    }
                    if (id.includes('echarts') || id.includes('zrender') || id.includes('vue-echarts')) {
                        return 'vendor-charts';
                    }
                    if (id.includes('/vue/') || id.includes('/@vue/') || id.includes('pinia')) {
                        return 'vendor-vue';
                    }
                    if (id.includes('dayjs') || id.includes('date-fns') || id.includes('markdown-it')) {
                        return 'vendor-utils';
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
