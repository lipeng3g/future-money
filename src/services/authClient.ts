import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: '/api/auth',
});

export const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? '';
export const authEmailActionsEnabled =
  import.meta.env.VITE_AUTH_EMAIL_ENABLED === '1' && Boolean(turnstileSiteKey);
