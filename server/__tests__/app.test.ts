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
});
