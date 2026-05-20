import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { DEFAULT_LOCATION, findShops } from '../services/shops.service.js';

export const shopsRouter = new OpenAPIHono();

shopsRouter.use('/*', authMiddleware);

const ShopSchema = z.object({
  name: z.string(),
  address: z.string(),
  location: z.object({ lat: z.number(), lng: z.number() }),
  distanceMeters: z.number().optional(),
  rating: z.number().optional(),
  mapsUrl: z.string(),
});

const ShopsResponseSchema = z.object({
  origin: z.object({ lat: z.number(), lng: z.number() }),
  shops: z.array(ShopSchema),
});

const NumericString = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'must be a number')
  .optional();

const listShopsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Shops'],
  summary: 'Find nearby agriculture shops',
  description:
    'Searches Google Places for agriculture-related shops near a point. Falls back to mock data when no API key is configured. Always scoped to agriculture shops.',
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      lat: NumericString,
      lng: NumericString,
      radius: NumericString,
      limit: NumericString,
      query: z.string().optional(),
      productKeywords: z
        .string()
        .optional()
        .openapi({ description: 'Comma-separated product keywords (e.g. "mancozeb,copper fungicide")' }),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: ShopsResponseSchema } },
      description: 'Shop results',
    },
  },
});

shopsRouter.openapi(listShopsRoute, async (c) => {
  const q = c.req.valid('query');

  const lat = q.lat !== undefined ? Number(q.lat) : DEFAULT_LOCATION.lat;
  const lng = q.lng !== undefined ? Number(q.lng) : DEFAULT_LOCATION.lng;
  const radiusMeters = q.radius !== undefined ? Math.min(Number(q.radius), 50_000) : undefined;
  const limit = q.limit !== undefined ? Math.min(Number(q.limit), 20) : undefined;
  const productKeywords = q.productKeywords
    ? q.productKeywords.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const shops = await findShops({
    location: { lat, lng },
    productKeywords,
    query: q.query,
    radiusMeters,
    limit,
  });

  return c.json({ origin: { lat, lng }, shops }, 200);
});
