import { Hono } from 'hono';

const app = new Hono<{ Bindings: Env }>();

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
