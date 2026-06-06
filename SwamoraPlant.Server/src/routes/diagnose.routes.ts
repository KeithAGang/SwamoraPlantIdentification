import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { diagnose, getDiagnosisById } from '../services/diagnosis.service.js';
import { PLANT_TYPES, isPlantType } from '../ml/plant-types.js';

export const diagnoseRouter = new OpenAPIHono();

diagnoseRouter.use('/*', authMiddleware);

const PredictionSchema = z.object({
  label: z.string(),
  confidence: z.number(),
});

const TreatmentProductSchema = z.object({
  name: z.string(),
  size: z.string(),
  priceUsd: z.number(),
});

const TreatmentSchema = z.object({
  summary: z.string(),
  medicine: z.string().nullable(),
  products: z.array(TreatmentProductSchema),
  productKeywords: z.array(z.string()),
});

const DiseaseInfoSchema = z.object({
  name: z.string(),
  scientificName: z.string().nullable(),
  severity: z.enum(['none', 'mild', 'moderate', 'severe']),
  description: z.string(),
  symptoms: z.array(z.string()),
});

const ShopSchema = z.object({
  name: z.string(),
  address: z.string(),
  location: z.object({ lat: z.number(), lng: z.number() }),
  distanceMeters: z.number().optional(),
  rating: z.number().optional(),
  mapsUrl: z.string(),
});

const DiagnoseResponseSchema = z.object({
  id: z.number(),
  plant: z.enum(PLANT_TYPES),
  topPrediction: PredictionSchema,
  predictions: z.array(PredictionSchema),
  treatment: TreatmentSchema,
  diseaseInfo: DiseaseInfoSchema,
  shops: z.array(ShopSchema),
  imageId: z.number(),
  createdAt: z.string(),
});

const diagnoseRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Diagnose'],
  summary: 'Diagnose a plant image',
  description:
    'Upload a plant image plus a plantType; the server runs the matching model and returns a diagnosis, treatment recommendation, and optionally nearby shops.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            image: z.instanceof(File).openapi({
              type: 'string',
              format: 'binary',
              description: 'Plant image file',
            }),
            plantType: z.enum(PLANT_TYPES).openapi({
              description: 'Which plant model to route the image to',
            }),
            lat: z
              .string()
              .optional()
              .openapi({ description: 'User latitude (for shop lookup)' }),
            lng: z
              .string()
              .optional()
              .openapi({ description: 'User longitude (for shop lookup)' }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: DiagnoseResponseSchema } },
      description: 'Diagnosis result',
    },
    400: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Invalid request',
    },
    401: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Unauthorized',
    },
    500: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Inference failure',
    },
  },
});

const parseCoord = (raw: unknown): number | undefined => {
  if (typeof raw !== 'string' || raw.length === 0) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const requireUserId = (c: any): number => {
  const payload = c.get('jwtUser') as { id?: number } | undefined;
  if (!payload?.id) throw new Error('Missing user in JWT payload');
  return payload.id;
};

diagnoseRouter.openapi(diagnoseRoute, async (c) => {
  const body = await c.req.parseBody();

  const file = body['image'];
  if (!(file instanceof File)) {
    return c.json({ error: 'No valid image file provided' }, 400);
  }

  const plantType = body['plantType'];
  if (!isPlantType(plantType)) {
    return c.json(
      { error: `plantType must be one of: ${PLANT_TYPES.join(', ')}` },
      400,
    );
  }

  const lat = parseCoord(body['lat']);
  const lng = parseCoord(body['lng']);
  const location = lat !== undefined && lng !== undefined ? { lat, lng } : undefined;

  try {
    const userId = requireUserId(c);
    const imageBuffer = Buffer.from(await file.arrayBuffer());
    const result = await diagnose({
      userId,
      plant: plantType,
      image: imageBuffer,
      originalName: file.name,
      contentType: file.type || 'image/jpeg',
      location,
    });
    return c.json(result, 200);
  } catch (err) {
    console.error('[diagnose] failed:', err);
    const message = err instanceof Error ? err.message : 'Diagnosis failed';
    return c.json({ error: message }, 500);
  }
});

// ── GET /api/diagnose/:id  ────────────────────────────────────────────────────
const diagnoseByIdRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Diagnose'],
  summary: 'Get a past diagnosis by id',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().regex(/^\d+$/),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: DiagnoseResponseSchema } },
      description: 'Diagnosis found',
    },
    404: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Not found',
    },
  },
});

diagnoseRouter.openapi(diagnoseByIdRoute, async (c) => {
  try {
    const userId = requireUserId(c);
    const id = Number(c.req.param('id'));
    const found = await getDiagnosisById(userId, id);
    if (!found) return c.json({ error: 'Diagnosis not found' }, 404);
    return c.json(found, 200);
  } catch (err) {
    console.error('[diagnose:get] failed:', err);
    return c.json({ error: 'Lookup failed' }, 404);
  }
});
