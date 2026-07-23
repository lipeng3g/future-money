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
});
