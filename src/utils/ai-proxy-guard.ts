/**
 * Shared (browser + dev server) AI proxy guard.
 *
 * IMPORTANT: This module must stay platform-neutral (no DOM, no localStorage),
 * so it can be imported by vite.config.ts (Node) and app code (browser).
 */

const normalizeHostname = (hostname: string): string => {
  // new URL('http://example.com./').hostname === 'example.com.' (trailing dot)
  // We strip trailing dots so FQDN forms can't bypass suffix checks.
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^\[(.*)\]$/, '$1')
    .replace(/\.+$/, '');
};

const isIPv4Literal = (value: string) => {
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return false;
  return value.split('.').every((part) => {
    const num = Number.parseInt(part, 10);
    return Number.isFinite(num) && num >= 0 && num <= 255;
  });
};

const isIPv6Literal = (value: string) => value.includes(':');

const endsWithHost = (hostname: string, host: string) => hostname === host || hostname.endsWith(`.${host}`);

export const isPrivateOrUnsafeHostname = (hostname: string): boolean => {
  if (!hostname) return true;

  const normalized = normalizeHostname(hostname);

  // Block localhost-like special domains that resolve to loopback.
  // These are common bypass vectors when we do not perform DNS resolution.
  if (endsWithHost(normalized, 'lvh.me') || endsWithHost(normalized, 'localtest.me')) {
    return true;
  }

  // Block wildcard IP-to-hostname services.
  // Examples:
  // - 127.0.0.1.nip.io
  // - 127-0-0-1.sslip.io
  const isIpEncodedHost = (suffix: string) => {
    if (!endsWithHost(normalized, suffix)) return false;

    const prefix = normalized.slice(0, -suffix.length).replace(/\.$/, '');
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

  // Some environments stringify IPv6-mapped IPv4 addresses in a compact hex form,
  // e.g. new URL('http://[::ffff:127.0.0.1]/').hostname === '[::ffff:7f00:1]'.
  // We conservatively block any IPv6 that declares itself as an IPv4-mapped address
  // (including the compact form) to avoid bypassing IPv4 localhost/private checks.
  if (/^::ffff:/i.test(normalized)) {
    return true;
  }

  if (
    normalized === 'localhost' ||
    normalized === 'localhost.' ||
    endsWithHost(normalized, 'localhost') ||
    endsWithHost(normalized, 'localhost.') ||
    normalized === '0.0.0.0' ||
    normalized === '::' ||
    normalized === '::1'
  ) {
    return true;
  }

  if (isIPv4Literal(normalized)) {
    if (
      normalized.startsWith('127.') ||
      normalized.startsWith('10.') ||
      normalized.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized) ||
      /^169\.254\./.test(normalized) ||
      /^100\.(6[4-9]|[78]\d|9\d|1[01]\d|12[0-7])\./.test(normalized)
    ) {
      return true;
    }
  }

  // Only apply ULA/link-local checks to IPv6 literals.
  // Avoid blocking normal domain names like "fd.com".
  if (isIPv6Literal(normalized)) {
    if (/^(fc|fd)[0-9a-f]{0,2}:/i.test(normalized)) return true;
    if (/^fe[89ab][0-9a-f]{0,2}:/i.test(normalized)) return true;
  }

  return false;
};

export const isAllowedAiProxyTargetUrl = (targetUrl: string): boolean => {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return false;
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return false;
  }

  // Disallow embedding credentials in the URL (e.g. https://user:pass@host/...).
  // If auth is needed, it must be provided via Authorization header.
  if (parsedUrl.username || parsedUrl.password) {
    return false;
  }

  // Disallow query/hash to avoid accidental leakage and keep the target stable.
  // This also prevents bypass patterns like appending junk query params.
  if (parsedUrl.search || parsedUrl.hash) {
    return false;
  }

  const hostname = parsedUrl.hostname;
  if (isPrivateOrUnsafeHostname(hostname)) {
    return false;
  }

  return parsedUrl.pathname.replace(/\/+$/, '').endsWith('/chat/completions');
};
