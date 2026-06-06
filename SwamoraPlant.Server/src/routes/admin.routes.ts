/**
 * Admin-only API surface. All routes require both a valid JWT (authMiddleware)
 * AND the user's row to have `isAdmin = true` (requireAdmin).
 *
 *   GET    /api/admin/stats              → site-wide aggregates
 *   GET    /api/admin/users              → list all users + per-user stats
 *   PATCH  /api/admin/users/:id/admin    → grant/revoke admin
 *   DELETE /api/admin/users/:id          → delete a user (cascades content)
 *   GET    /api/admin/farms              → list all farms with owner
 *   GET    /api/admin/diagnoses          → recent diagnoses across all users
 */

import { Hono } from 'hono';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware.js';
import {
  deleteUser,
  getSiteStats,
  listAllFarms,
  listAllUsers,
  listRecentDiagnoses,
  setUserAdmin,
} from '../services/admin.service.js';

export const adminRouter = new Hono();
adminRouter.use('/*', authMiddleware, requireAdmin);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getUserId = (c: any): number => {
  const payload = c.get('jwtUser') as { id?: number } | undefined;
  if (!payload?.id) throw new Error('Missing user in JWT payload');
  return payload.id;
};

adminRouter.get('/stats', async (c) => {
  try {
    const stats = await getSiteStats();
    return c.json(stats);
  } catch (err) {
    console.error('[admin:stats]', err);
    return c.json({ error: 'Stats lookup failed' }, 500);
  }
});

adminRouter.get('/users', async (c) => {
  try {
    const users = await listAllUsers();
    return c.json({ users });
  } catch (err) {
    console.error('[admin:users]', err);
    return c.json({ error: 'Lookup failed' }, 500);
  }
});

adminRouter.patch('/users/:id/admin', async (c) => {
  try {
    const callerId = getUserId(c);
    const targetId = Number(c.req.param('id'));
    if (!Number.isFinite(targetId)) return c.json({ error: 'Invalid id' }, 400);
    if (targetId === callerId) {
      return c.json({ error: 'You cannot change your own admin status' }, 400);
    }
    const body = await c.req.json<{ isAdmin?: boolean }>();
    if (typeof body.isAdmin !== 'boolean') {
      return c.json({ error: 'isAdmin must be a boolean' }, 400);
    }
    const updated = await setUserAdmin(targetId, body.isAdmin);
    if (!updated) return c.json({ error: 'Not found' }, 404);
    return c.json({ user: updated });
  } catch (err) {
    console.error('[admin:set-admin]', err);
    return c.json({ error: 'Update failed' }, 500);
  }
});

adminRouter.delete('/users/:id', async (c) => {
  try {
    const callerId = getUserId(c);
    const targetId = Number(c.req.param('id'));
    if (!Number.isFinite(targetId)) return c.json({ error: 'Invalid id' }, 400);
    if (targetId === callerId) {
      return c.json({ error: 'You cannot delete your own account here' }, 400);
    }
    const deleted = await deleteUser(targetId);
    if (!deleted) return c.json({ error: 'Not found' }, 404);
    return c.json({ ok: true });
  } catch (err) {
    console.error('[admin:delete-user]', err);
    return c.json({ error: 'Delete failed' }, 500);
  }
});

adminRouter.get('/farms', async (c) => {
  try {
    const farms = await listAllFarms();
    return c.json({ farms });
  } catch (err) {
    console.error('[admin:farms]', err);
    return c.json({ error: 'Lookup failed' }, 500);
  }
});

adminRouter.get('/diagnoses', async (c) => {
  try {
    const limitParam = Number(c.req.query('limit'));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 1000) : 25;
    const diagnoses = await listRecentDiagnoses(limit);
    return c.json({ diagnoses });
  } catch (err) {
    console.error('[admin:diagnoses]', err);
    return c.json({ error: 'Lookup failed' }, 500);
  }
});
