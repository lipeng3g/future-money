import { Hono } from 'hono';
import {
  AuthConfigurationError,
  createAuth,
  getAuthProviderAvailability,
  type AuthBindings,
} from './auth/createAuth';

const app = new Hono<{ Bindings: AuthBindings }>();

app.on(['GET', 'POST'], '/api/auth/*', async (context) => {
  if (isLegacyEmailAuthPath(new URL(context.req.url).pathname)) {
    return context.json({ error: 'not_found', message: 'API endpoint not found' }, 404);
  }

  try {
    return await createAuth(context.env).handler(context.req.raw);
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      console.error('Authentication service is not configured', { code: error.code });
      return context.json(
        { error: 'auth_unavailable', message: 'Authentication service is unavailable' },
        503,
      );
    }

    throw error;
  }
});

function isLegacyEmailAuthPath(pathname: string): boolean {
  return pathname.startsWith('/api/auth/reset-password') || [
    '/api/auth/sign-up/email',
    '/api/auth/sign-in/email',
    '/api/auth/request-password-reset',
    '/api/auth/send-verification-email',
    '/api/auth/verify-email',
    '/api/auth/change-email',
  ].includes(pathname);
}

app.get('/api/v1/auth/providers', (context) => {
  const providers = getAuthProviderAvailability(context.env);
  return context.json({ providers }, 200, {
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
  });
});

app.get('/api/v1/health', async (context) => {
  const checkedAt = new Date().toISOString();

  try {
    const result = await context.env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>();

    if (result?.ok !== 1) {
      return context.json(
        { status: 'degraded', database: 'unexpected-response', checkedAt },
        503,
      );
    }

    return context.json({ status: 'ok', database: 'ok', checkedAt });
  } catch (error) {
    console.error(
      'D1 health check failed',
      error instanceof Error ? { name: error.name, message: error.message } : { name: 'UnknownError' },
    );

    return context.json({ status: 'degraded', database: 'unavailable', checkedAt }, 503);
  }
});

app.notFound((context) =>
  context.json({ error: 'not_found', message: 'API endpoint not found' }, 404),
);

export default app;
