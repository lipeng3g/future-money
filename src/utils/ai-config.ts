/**
 * AI 配置管理与目标校验（轻量模块）
 *
 * 目的：避免在非 AI 场景把完整 AI 工具链打进 index chunk。
 */

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

const CONFIG_KEY = 'fm-ai-config';
const DEFAULT_AI_MODEL = 'gpt-4o-mini';

const isPrivateOrUnsafeAiHostname = (hostname: string): boolean => {
  if (!hostname) return true;

  const normalized = hostname.trim().toLowerCase();
  const withoutBrackets = normalized.replace(/^\[(.*)\]$/, '$1');

  const endsWithHost = (host: string) => withoutBrackets === host || withoutBrackets.endsWith(`.${host}`);

  // Block localhost-like special domains that resolve to loopback.
  if (endsWithHost('lvh.me') || endsWithHost('localtest.me')) {
    return true;
  }

  // Block wildcard IP-to-hostname services.
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

    return Boolean(octets);
  };

  if (isIpEncodedHost('nip.io') || isIpEncodedHost('xip.io') || isIpEncodedHost('sslip.io')) {
    return true;
  }

  // Block IPv6-mapped IPv4.
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

export const buildAiChatCompletionsUrl = (baseUrl: string): string => {
  const normalizedBaseUrl = normalizeAiBaseUrlForTarget(baseUrl);

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
