/**
 * Crowdsourced shop submissions.
 *
 *   POST /api/shop-submissions    – user submits a shop they know about
 *
 * Lightweight on purpose — moderation/promotion happens later.
 */

import { Hono } from 'hono';
import { db } from '../db/index.js';
import { shopSubmissions } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

export const shopSubmissionsRouter = new Hono();
shopSubmissionsRouter.use('/*', authMiddleware);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getUserId = (c: any): number => {
  const payload = c.get('jwtUser') as { id?: number } | undefined;
  if (!payload?.id) throw new Error('Missing user in JWT payload');
  return payload.id;
};

interface SubmissionBody {
  name?: string;
  address?: string;
  city?: string;
  phone?: string;
  notes?: string;
  lat?: number;
  lng?: number;
}

shopSubmissionsRouter.post('/', async (c) => {
  try {
    const userId = getUserId(c);
    const body = (await c.req.json().catch(() => ({}))) as SubmissionBody;
    const name = body.name?.trim();
    const address = body.address?.trim();
    if (!name || !address) {
      return c.json({ error: 'name and address are required' }, 400);
    }

    await db.insert(shopSubmissions).values({
      userId,
      name,
      address,
      city: body.city?.trim() || null,
      phone: body.phone?.trim() || null,
      notes: body.notes?.trim() || null,
      lat: typeof body.lat === 'number' ? body.lat : null,
      lng: typeof body.lng === 'number' ? body.lng : null,
    });

    return c.json({ ok: true });
  } catch (err) {
    console.error('[shop-submissions:add] failed:', err);
    return c.json({ error: 'Submission failed' }, 500);
  }
});
