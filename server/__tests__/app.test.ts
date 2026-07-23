import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../app';

function createDatabase(result: { ok: number } | null): D1Database {
  return {
    prepare: vi.fn(() => ({
      first: vi.fn().mockResolvedValue(result),
    })),
  } as unknown as D1Database;
}

describe('Pages Functions API', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns healthy when D1 responds', async () => {
    const response = await app.request('/api/v1/health', {}, { DB: createDatabase({ ok: 1 }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: 'ok', database: 'ok' });
  });

  it('returns degraded when D1 is unavailable', async () => {
    const database = {
      prepare: vi.fn(() => ({
        first: vi.fn().mockRejectedValue(new Error('database unavailable')),
      })),
    } as unknown as D1Database;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await app.request('/api/v1/health', {}, { DB: database });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: 'degraded',
      database: 'unavailable',
    });
  });

  it('returns JSON 404 for unknown API routes', async () => {
    const response = await app.request('/api/v1/missing', {}, { DB: createDatabase(null) });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: 'not_found',
      message: 'API endpoint not found',
    });
  });

  it('fails closed when authentication secret is missing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await app.request('/api/auth/get-session', {}, { DB: createDatabase(null) });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'auth_unavailable',
      message: 'Authentication service is unavailable',
    });
  });

  it('blocks registration while the email feature is disabled', async () => {
    const response = await app.request(
      '/api/auth/sign-up/email',
      { method: 'POST' },
      { DB: createDatabase(null) },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'auth_email_unavailable',
      message: 'Email registration is not available yet',
    });
  });

  it('requires a Turnstile response when email auth is enabled', async () => {
    const response = await app.request(
      '/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@example.com', password: '1234567890' }),
      },
      {
        DB: createDatabase(null),
        BETTER_AUTH_SECRET: 'local-test-secret-with-at-least-32-characters',
        AUTH_EMAIL_ENABLED: '1',
        TURNSTILE_SECRET_KEY: 'turnstile-test-secret',
        RESEND_API_KEY: 'resend-test-key',
        AUTH_FROM_EMAIL: 'FutureMoney <no-reply@example.com>',
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'MISSING_RESPONSE' });
  });
});
