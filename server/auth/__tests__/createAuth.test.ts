import { describe, expect, it, vi } from 'vitest';
import { AuthConfigurationError, createAuth, type AuthBindings } from '../createAuth';
import type { AuthEmailSender } from '../emailSender';

const database = {} as D1Database;
const emailSender: AuthEmailSender = {
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
};

function createBindings(secret?: string): AuthBindings {
  return {
    DB: database,
    BETTER_AUTH_SECRET: secret,
  };
}

describe('createAuth', () => {
  it('requires an authentication secret', () => {
    expect(() => createAuth(createBindings(), { emailSender })).toThrowError(
      new AuthConfigurationError('AUTH_SECRET_MISSING'),
    );
  });

  it('rejects secrets shorter than 32 characters', () => {
    expect(() => createAuth(createBindings('too-short'), { emailSender })).toThrowError(
      new AuthConfigurationError('AUTH_SECRET_TOO_SHORT'),
    );
  });

  it('creates the Better Auth handler with valid bindings', () => {
    const auth = createAuth(createBindings('local-test-secret-with-at-least-32-characters'), {
      emailSender,
    });

    expect(auth.handler).toBeTypeOf('function');
  });

  it('fails closed when email auth is enabled without all provider settings', () => {
    expect(() => createAuth({
      ...createBindings('local-test-secret-with-at-least-32-characters'),
      AUTH_EMAIL_ENABLED: '1',
    }, { emailSender })).toThrowError(new AuthConfigurationError('AUTH_EMAIL_INCOMPLETE'));
  });

  it('enables email auth when Turnstile and mail settings are complete', () => {
    const auth = createAuth({
      ...createBindings('local-test-secret-with-at-least-32-characters'),
      AUTH_EMAIL_ENABLED: '1',
      TURNSTILE_SECRET_KEY: 'turnstile-test-secret',
      RESEND_API_KEY: 'resend-test-key',
      AUTH_FROM_EMAIL: 'FutureMoney <no-reply@example.com>',
    }, { emailSender });

    expect(auth.handler).toBeTypeOf('function');
  });
});
