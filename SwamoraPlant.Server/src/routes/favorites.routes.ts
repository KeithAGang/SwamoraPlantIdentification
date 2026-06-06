/**
 * Saved-shops ("favourites") API.
 *
 *   GET    /api/favorites          → list current user's saved shops
 *   POST   /api/favorites          → add a shop (idempotent by shopKey)
 *   DELETE /api/favorites/:key     → remove by shopKey
 *
 * shopKey is the Google place_id when available, otherwise a stable composite
 * of name + address. The client picks the key.
 */

import { Hono } from 'hono';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { favoriteShops } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

export const favoritesRouter = new Hono();
favoritesRouter.use('/*', authMiddleware);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getUserId = (c: any): number => {
  const payload = c.get('jwtUser') as { id?: number } | undefined;
  if (!payload?.id) throw new Error('Missing user in JWT payload');
  return payload.id;
};

interface FavoriteBody {
  shopKey?: string;
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  rating?: number | null;
  mapsUrl?: string | null;
}

favoritesRouter.get('/', async (c) => {
  try {
    const userId = getUserId(c);
    const rows = await db
      .select()
      .from(favoriteShops)
      .where(eq(favoriteShops.userId, userId))
      .orderBy(sql`${favoriteShops.createdAt} desc`);
    return c.json({
      favorites: rows.map((r) => ({
        shopKey: r.shopKey,
        name: r.name,
        address: r.address,
        location: { lat: r.lat, lng: r.lng },
        rating: r.rating ?? undefined,
        mapsUrl: r.mapsUrl ?? undefined,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error('[favorites:list] failed:', err);
    return c.json({ error: 'Lookup failed' }, 500);
  }
});

favoritesRouter.post('/', async (c) => {
  try {
    const userId = getUserId(c);
    const body = (await c.req.json().catch(() => ({}))) as FavoriteBody;
    if (
      !body.shopKey ||
      !body.name ||
      !body.address ||
      typeof body.lat !== 'number' ||
      typeof body.lng !== 'number'
    ) {
      return c.json({ error: 'shopKey, name, address, lat, lng are required' }, 400);
    }

    // Upsert-by-(userId, shopKey).
    const existing = await db
      .select()
      .from(favoriteShops)
      .where(
        and(
          eq(favoriteShops.userId, userId),
          eq(favoriteShops.shopKey, body.shopKey),
        ),
      )
      .limit(1);
    if (existing[0]) {
      return c.json({ ok: true, alreadyExists: true });
    }

    await db.insert(favoriteShops).values({
      userId,
      shopKey: body.shopKey,
      name: body.name,
      address: body.address,
      lat: body.lat,
      lng: body.lng,
      rating: body.rating ?? null,
      mapsUrl: body.mapsUrl ?? null,
    });

    return c.json({ ok: true });
  } catch (err) {
    console.error('[favorites:add] failed:', err);
    return c.json({ error: 'Save failed' }, 500);
  }
});

favoritesRouter.delete('/:key', async (c) => {
  try {
    const userId = getUserId(c);
    const key = c.req.param('key');
    await db
      .delete(favoriteShops)
      .where(
        and(eq(favoriteShops.userId, userId), eq(favoriteShops.shopKey, key)),
      );
    return c.json({ ok: true });
  } catch (err) {
    console.error('[favorites:remove] failed:', err);
    return c.json({ error: 'Remove failed' }, 500);
  }
});
