/**
 * AI 配置管理与目标校验（轻量模块）
 *
 * 目的：避免在非 AI 场景把完整 AI 工具链打进 index chunk。
 */

import { isAllowedAiProxyTargetUrl, isPrivateOrUnsafeHostname } from '@/utils/ai-proxy-guard';

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

const CONFIG_KEY = 'fm-ai-config';
const DEFAULT_AI_MODEL = 'gpt-4o-mini';

export const isAllowedAiProxyTarget = (targetUrl: string): boolean => {
  return isAllowedAiProxyTargetUrl(targetUrl);
};

export const normalizeAiBaseUrl = (input: string): string => {
  if (typeof input !== 'string') {
    throw new Error('API 地址格式不正确');
  }

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

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('API 地址不安全：不允许包含用户名或密码');
  }

  // Strip query/hash to make the base URL stable and avoid accidental leakage.
  // e.g. "https://api.example.com/v1/chat/completions?foo=bar#baz".
  parsedUrl.search = '';
  parsedUrl.hash = '';

  const hostname = parsedUrl.hostname.trim().toLowerCase();
  if (isPrivateOrUnsafeHostname(hostname)) {
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
