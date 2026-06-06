import { createMiddleware } from 'hono/factory';
import { findUserById, verifyToken } from '../services/auth.service.js';

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  try {
    const token = authHeader.slice(7);
    const payload = await verifyToken(token);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.set('jwtUser' as any, payload);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
});

// Run AFTER `authMiddleware` — verifies the authenticated user has `isAdmin`.
export const requireAdmin = createMiddleware(async (c, next) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload = (c as any).get('jwtUser') as { id?: number } | undefined;
  if (!payload?.id) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const user = await findUserById(payload.id);
  if (!user || !user.isAdmin) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
});
