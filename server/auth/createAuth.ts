import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import * as authSchema from '../db/auth-schema';
import {
  createAuthEmailSender,
  type AuthEmailBindings,
  type AuthEmailSender,
} from './emailSender';

export interface AuthBindings extends Env, AuthEmailBindings {
  BETTER_AUTH_SECRET?: string;
}

interface CreateAuthDependencies {
  emailSender?: AuthEmailSender;
}

export class AuthConfigurationError extends Error {
  readonly code: 'AUTH_SECRET_MISSING' | 'AUTH_SECRET_TOO_SHORT';

  constructor(code: AuthConfigurationError['code']) {
    super(code === 'AUTH_SECRET_MISSING' ? 'Authentication secret is missing' : 'Authentication secret is too short');
    this.name = 'AuthConfigurationError';
    this.code = code;
  }
}

export function createAuth(
  bindings: AuthBindings,
  dependencies: CreateAuthDependencies = {},
) {
  const secret = requireAuthSecret(bindings.BETTER_AUTH_SECRET);
  const emailSender = dependencies.emailSender ?? createAuthEmailSender(bindings);

  return betterAuth({
    appName: 'FutureMoney',
    baseURL: {
      allowedHosts: [
        'future-money.pages.dev',
        '*.future-money.pages.dev',
        'localhost:8788',
        '127.0.0.1:8788',
      ],
      fallback: 'https://future-money.pages.dev',
      protocol: 'auto',
    },
    basePath: '/api/auth',
    secret,
    database: drizzleAdapter(drizzle(bindings.DB), {
      provider: 'sqlite',
      schema: authSchema,
      transaction: false,
    }),
    trustedOrigins: [
      'https://future-money.pages.dev',
      'https://*.future-money.pages.dev',
      'http://localhost:8788',
      'http://127.0.0.1:8788',
    ],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: false,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }) =>
        emailSender.sendPasswordResetEmail({ email: user.email, url }),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60,
      sendVerificationEmail: ({ user, url }) =>
        emailSender.sendVerificationEmail({ email: user.email, url }),
    },
    verification: {
      storeIdentifier: 'hashed',
    },
    advanced: {
      cookiePrefix: 'future-money',
    },
  });
}

function requireAuthSecret(value: string | undefined): string {
  const secret = value?.trim();

  if (!secret) {
    throw new AuthConfigurationError('AUTH_SECRET_MISSING');
  }

  if (secret.length < 32) {
    throw new AuthConfigurationError('AUTH_SECRET_TOO_SHORT');
  }

  return secret;
}
