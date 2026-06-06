import { serve } from '@hono/node-server';
import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { cors } from 'hono/cors';
import { imageRouter } from './routes/image.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { diagnoseRouter } from './routes/diagnose.routes.js';
import { shopsRouter } from './routes/shops.routes.js';
import { chatRouter } from './routes/chat.routes.js';
import { favoritesRouter } from './routes/favorites.routes.js';
import { shopSubmissionsRouter } from './routes/shop-submissions.routes.js';
import { farmsRouter } from './routes/farms.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as https from 'https';

dotenv.config();

const app = new OpenAPIHono();

app.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

app.use('*', cors({
  origin: (origin) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
    if (!origin || process.env.NODE_ENV !== 'production') {
      return origin;
    }
    if (allowedOrigins.includes(origin)) {
      return origin;
    }
    // Allow common tunnel providers (VS Code dev tunnels, ngrok, cloudflare) so
    // the app can be shared from a local dev machine during demos.
    try {
      const host = new URL(origin).hostname;
      if (/\.(devtunnels\.ms|ngrok-free\.app|ngrok\.io|trycloudflare\.com)$/i.test(host)) {
        return origin;
      }
    } catch {
      // fall through
    }
    return allowedOrigins[0];
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  credentials: true,
}));

app.route('/api/auth', authRouter);
app.route('/api/image', imageRouter);
app.route('/api/diagnose', diagnoseRouter);
app.route('/api/shops', shopsRouter);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.route('/api/savi', chatRouter as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.route('/api/favorites', favoritesRouter as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.route('/api/farms', farmsRouter as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.route('/api/admin', adminRouter as any);
app.route('/api/shop-submissions', shopSubmissionsRouter as any);

app.get('/doc', (c) => {
  const schema = app.getOpenAPIDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'SwamoraPlant API',
      description: 'Plant image upload API. POST /api/auth/login to get a JWT, then pass it as `Authorization: Bearer <token>` on protected routes.',
    },
  });
  return c.json(schema);
});

app.get(
  '/reference',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiReference({ spec: { url: '/doc' } } as any)
);

app.get('/', (c) =>
  c.text('SwamoraPlant Server is running. Visit /reference for API docs.')
);

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
  const options = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH),
  };
  serve({ fetch: app.fetch, port, createServer: https.createServer, serverOptions: options });
  console.log(`Secure server running on https://localhost:${port}`);
} else {
  serve({ fetch: app.fetch, port });
  console.log(`Server running on http://localhost:${port}`);
}
