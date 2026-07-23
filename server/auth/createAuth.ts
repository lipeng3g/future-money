import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import * as authSchema from '../db/auth-schema';

export interface AuthBindings extends Env {
  BETTER_AUTH_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

export class AuthConfigurationError extends Error {
  readonly code: 'AUTH_SECRET_MISSING' | 'AUTH_SECRET_TOO_SHORT';

  constructor(code: AuthConfigurationError['code']) {
    super(
      code === 'AUTH_SECRET_MISSING'
        ? 'Authentication secret is missing'
        : 'Authentication secret is too short',
    );
    this.name = 'AuthConfigurationError';
    this.code = code;
  }
}

export function createAuth(bindings: AuthBindings) {
  const secret = requireAuthSecret(bindings.BETTER_AUTH_SECRET);
  const github = getProviderCredentials(bindings.GITHUB_CLIENT_ID, bindings.GITHUB_CLIENT_SECRET);
  const google = getProviderCredentials(bindings.GOOGLE_CLIENT_ID, bindings.GOOGLE_CLIENT_SECRET);

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
    socialProviders: {
      ...(github ? { github } : {}),
      ...(google ? { google } : {}),
    },
    advanced: {
      cookiePrefix: 'future-money',
    },
  });
}

export function getAuthProviderAvailability(bindings: AuthBindings) {
  return {
    github: Boolean(getProviderCredentials(bindings.GITHUB_CLIENT_ID, bindings.GITHUB_CLIENT_SECRET)),
    google: Boolean(getProviderCredentials(bindings.GOOGLE_CLIENT_ID, bindings.GOOGLE_CLIENT_SECRET)),
  };
}

function getProviderCredentials(clientId?: string, clientSecret?: string) {
  const normalizedClientId = clientId?.trim();
  const normalizedClientSecret = clientSecret?.trim();
  return normalizedClientId && normalizedClientSecret
    ? { clientId: normalizedClientId, clientSecret: normalizedClientSecret }
    : null;
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
