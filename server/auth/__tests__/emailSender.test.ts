import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AuthEmailConfigurationError,
  createAuthEmailSender,
} from '../emailSender';

describe('createAuthEmailSender', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fails closed when Resend bindings are missing', async () => {
    const sender = createAuthEmailSender({});

    await expect(
      sender.sendVerificationEmail({
        email: 'user@example.com',
        url: 'https://future-money.pages.dev/api/auth/verify-email?token=test',
      }),
    ).rejects.toBeInstanceOf(AuthEmailConfigurationError);
  });

  it('sends verification email through the Resend HTTP API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const sender = createAuthEmailSender({
      RESEND_API_KEY: 'test-api-key',
      AUTH_FROM_EMAIL: 'FutureMoney <no-reply@example.com>',
    });

    await sender.sendVerificationEmail({
      email: 'user@example.com',
      url: 'https://future-money.pages.dev/api/auth/verify-email?token=a&next=<home>',
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer test-api-key' });

    const body = JSON.parse(String(init.body)) as { to: string[]; html: string };
    expect(body.to).toEqual(['user@example.com']);
    expect(body.html).toContain('token=a&amp;next=&lt;home&gt;');
    expect(body.html).not.toContain('token=a&next=<home>');
  });

  it('does not expose provider response bodies in errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('provider-secret-diagnostic', { status: 422 }),
      ),
    );
    const sender = createAuthEmailSender({
      RESEND_API_KEY: 'test-api-key',
      AUTH_FROM_EMAIL: 'FutureMoney <no-reply@example.com>',
    });

    await expect(
      sender.sendPasswordResetEmail({
        email: 'user@example.com',
        url: 'https://future-money.pages.dev/reset-password?token=test',
      }),
    ).rejects.toThrow('Authentication email provider rejected the request (422)');
  });
});
