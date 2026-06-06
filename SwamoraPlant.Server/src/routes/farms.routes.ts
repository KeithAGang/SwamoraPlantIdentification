/**
 * Farm + widget API. A farm is a user-named space. Each farm carries a
 * sortable collection of widgets the user has chosen to track.
 *
 *   GET    /api/farms                       → list user's farms
 *   POST   /api/farms                       → create a farm
 *   GET    /api/farms/:id                   → get one farm
 *   PATCH  /api/farms/:id                   → update farm
 *   DELETE /api/farms/:id                   → remove farm (cascades widgets)
 *
 *   GET    /api/farms/:id/widgets           → list widgets on a farm
 *   POST   /api/farms/:id/widgets           → add a widget
 *   POST   /api/farms/:id/widgets/reorder   → reorder by id list
 *   PATCH  /api/farms/:id/widgets/:wid      → update widget
 *   DELETE /api/farms/:id/widgets/:wid      → remove widget
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  createFarm,
  createWidget,
  deleteFarm,
  deleteWidget,
  getFarm,
  listFarms,
  listWidgets,
  reorderWidgets,
  updateFarm,
  updateWidget,
} from '../services/farms.service.js';

export const farmsRouter = new Hono();
farmsRouter.use('/*', authMiddleware);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getUserId = (c: any): number => {
  const payload = c.get('jwtUser') as { id?: number } | undefined;
  if (!payload?.id) throw new Error('Missing user in JWT payload');
  return payload.id;
};

const serializeFarm = (f: Awaited<ReturnType<typeof getFarm>>) =>
  f
    ? {
        id: f.id,
        name: f.name,
        cropType: f.cropType,
        location: f.location,
        lat: f.lat,
        lng: f.lng,
        coverImage: f.coverImage,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      }
    : null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeWidget = (w: any) => ({
  id: w.id,
  farmId: w.farmId,
  type: w.type,
  title: w.title,
  size: w.size,
  position: w.position,
  config: w.config ?? {},
  dataSource: w.dataSource,
  createdAt: w.createdAt instanceof Date ? w.createdAt.toISOString() : w.createdAt,
});

/* ------------------------------- Farms ------------------------------- */

farmsRouter.get('/', async (c) => {
  try {
    const userId = getUserId(c);
    const rows = await listFarms(userId);
    return c.json({ farms: rows.map(serializeFarm) });
  } catch (err) {
    console.error('[farms:list]', err);
    return c.json({ error: 'Lookup failed' }, 500);
  }
});

farmsRouter.post('/', async (c) => {
  try {
    const userId = getUserId(c);
    const body = await c.req.json<{
      name?: string;
      cropType?: string | null;
      location?: string | null;
      lat?: number | null;
      lng?: number | null;
      coverImage?: string | null;
    }>();
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return c.json({ error: 'name is required' }, 400);
    }
    const created = await createFarm({
      userId,
      name: body.name.trim(),
      cropType: body.cropType ?? null,
      location: body.location ?? null,
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      coverImage: body.coverImage ?? null,
    });
    return c.json({ farm: serializeFarm(created) }, 201);
  } catch (err) {
    console.error('[farms:create]', err);
    return c.json({ error: 'Create failed' }, 500);
  }
});

farmsRouter.get('/:id', async (c) => {
  try {
    const userId = getUserId(c);
    const farmId = Number(c.req.param('id'));
    if (!Number.isFinite(farmId)) return c.json({ error: 'Invalid id' }, 400);
    const farm = await getFarm(userId, farmId);
    if (!farm) return c.json({ error: 'Not found' }, 404);
    return c.json({ farm: serializeFarm(farm) });
  } catch (err) {
    console.error('[farms:get]', err);
    return c.json({ error: 'Lookup failed' }, 500);
  }
});

farmsRouter.patch('/:id', async (c) => {
  try {
    const userId = getUserId(c);
    const farmId = Number(c.req.param('id'));
    if (!Number.isFinite(farmId)) return c.json({ error: 'Invalid id' }, 400);
    const body = await c.req.json();
    const updated = await updateFarm(userId, farmId, body);
    if (!updated) return c.json({ error: 'Not found' }, 404);
    return c.json({ farm: serializeFarm(updated) });
  } catch (err) {
    console.error('[farms:update]', err);
    return c.json({ error: 'Update failed' }, 500);
  }
});

farmsRouter.delete('/:id', async (c) => {
  try {
    const userId = getUserId(c);
    const farmId = Number(c.req.param('id'));
    if (!Number.isFinite(farmId)) return c.json({ error: 'Invalid id' }, 400);
    const deleted = await deleteFarm(userId, farmId);
    if (!deleted) return c.json({ error: 'Not found' }, 404);
    return c.json({ ok: true });
  } catch (err) {
    console.error('[farms:delete]', err);
    return c.json({ error: 'Delete failed' }, 500);
  }
});

/* ------------------------------ Widgets ------------------------------ */

farmsRouter.get('/:id/widgets', async (c) => {
  try {
    const userId = getUserId(c);
    const farmId = Number(c.req.param('id'));
    if (!Number.isFinite(farmId)) return c.json({ error: 'Invalid id' }, 400);
    const farm = await getFarm(userId, farmId);
    if (!farm) return c.json({ error: 'Farm not found' }, 404);
    const widgets = await listWidgets(userId, farmId);
    return c.json({ widgets: widgets.map(serializeWidget) });
  } catch (err) {
    console.error('[widgets:list]', err);
    return c.json({ error: 'Lookup failed' }, 500);
  }
});

farmsRouter.post('/:id/widgets', async (c) => {
  try {
    const userId = getUserId(c);
    const farmId = Number(c.req.param('id'));
    if (!Number.isFinite(farmId)) return c.json({ error: 'Invalid id' }, 400);
    const farm = await getFarm(userId, farmId);
    if (!farm) return c.json({ error: 'Farm not found' }, 404);

    const body = await c.req.json<{
      type?: string;
      title?: string | null;
      size?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config?: Record<string, any>;
      dataSource?: string;
      position?: number;
    }>();
    if (!body.type || typeof body.type !== 'string') {
      return c.json({ error: 'type is required' }, 400);
    }

    // Append to the end of the list by default.
    const existing = await listWidgets(userId, farmId);
    const position =
      typeof body.position === 'number' ? body.position : existing.length;

    const created = await createWidget({
      userId,
      farmId,
      type: body.type,
      title: body.title ?? null,
      size: body.size ?? 'md',
      position,
      config: body.config ?? {},
      dataSource: body.dataSource ?? 'mock',
    });
    return c.json({ widget: serializeWidget(created) }, 201);
  } catch (err) {
    console.error('[widgets:create]', err);
    return c.json({ error: 'Create failed' }, 500);
  }
});

farmsRouter.post('/:id/widgets/reorder', async (c) => {
  try {
    const userId = getUserId(c);
    const farmId = Number(c.req.param('id'));
    if (!Number.isFinite(farmId)) return c.json({ error: 'Invalid id' }, 400);
    const body = await c.req.json<{ orderedIds?: number[] }>();
    if (!Array.isArray(body.orderedIds)) {
      return c.json({ error: 'orderedIds must be an array' }, 400);
    }
    const result = await reorderWidgets(userId, farmId, body.orderedIds);
    return c.json({ updated: result });
  } catch (err) {
    console.error('[widgets:reorder]', err);
    return c.json({ error: 'Reorder failed' }, 500);
  }
});

farmsRouter.patch('/:id/widgets/:wid', async (c) => {
  try {
    const userId = getUserId(c);
    const widgetId = Number(c.req.param('wid'));
    if (!Number.isFinite(widgetId)) return c.json({ error: 'Invalid id' }, 400);
    const body = await c.req.json();
    const updated = await updateWidget(userId, widgetId, body);
    if (!updated) return c.json({ error: 'Not found' }, 404);
    return c.json({ widget: serializeWidget(updated) });
  } catch (err) {
    console.error('[widgets:update]', err);
    return c.json({ error: 'Update failed' }, 500);
  }
});

farmsRouter.delete('/:id/widgets/:wid', async (c) => {
  try {
    const userId = getUserId(c);
    const widgetId = Number(c.req.param('wid'));
    if (!Number.isFinite(widgetId)) return c.json({ error: 'Invalid id' }, 400);
    const deleted = await deleteWidget(userId, widgetId);
    if (!deleted) return c.json({ error: 'Not found' }, 404);
    return c.json({ ok: true });
  } catch (err) {
    console.error('[widgets:delete]', err);
    return c.json({ error: 'Delete failed' }, 500);
  }
});
