import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { findUserByEmail, comparePassword, signToken, createUser } from '../services/auth.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

export const authRouter = new OpenAPIHono();

const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Auth'],
  summary: 'Sign in',
  description: 'Authenticate with email and password. Returns a JWT bearer token.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            email: z.string().email().openapi({ example: 'swamora@img.plant' }),
            password: z.string().min(1).openapi({ example: 'abcd1234' }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            token: z.string().openapi({ description: 'JWT bearer token' }),
            user: z.object({
              id: z.number(),
              email: z.string(),
              name: z.string(),
              isAdmin: z.boolean(),
            }),
          }),
        },
      },
      description: 'Login successful',
    },
    401: {
      content: {
        'application/json': {
          schema: z.object({ error: z.string() }),
        },
      },
      description: 'Invalid credentials',
    },
  },
});

const meRoute = createRoute({
  method: 'get',
  path: '/me',
  tags: ['Auth'],
  summary: 'Get current user',
  description: 'Returns the authenticated user\'s profile. Requires a valid JWT.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            id: z.number(),
            email: z.string(),
            name: z.string(),
            isAdmin: z.boolean(),
          }),
        },
      },
      description: 'Current user profile',
    },
    401: {
      content: {
        'application/json': {
          schema: z.object({ error: z.string() }),
        },
      },
      description: 'Unauthorized',
    },
  },
});

authRouter.openapi(loginRoute, async (c) => {
  const { email, password } = c.req.valid('json');
  const user = await findUserByEmail(email);
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }
  const token = await signToken({ id: user.id, email: user.email });
  return c.json(
    {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      },
    },
    200,
  );
});

const signupRoute = createRoute({
  method: 'post',
  path: '/signup',
  tags: ['Auth'],
  summary: 'Create account',
  description: 'Register a new user with name, email and password. Returns a JWT bearer token.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().min(1).openapi({ example: 'Jane Farmer' }),
            email: z.string().email().openapi({ example: 'jane@farm.example' }),
            password: z.string().min(8).openapi({ example: 'abcd1234' }),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({
            token: z.string().openapi({ description: 'JWT bearer token' }),
            user: z.object({
              id: z.number(),
              email: z.string(),
              name: z.string(),
              isAdmin: z.boolean(),
            }),
          }),
        },
      },
      description: 'Account created',
    },
    409: {
      content: {
        'application/json': {
          schema: z.object({ error: z.string() }),
        },
      },
      description: 'Email already registered',
    },
  },
});

authRouter.openapi(signupRoute, async (c) => {
  const { name, email, password } = c.req.valid('json');
  const existing = await findUserByEmail(email);
  if (existing) {
    return c.json({ error: 'Email is already registered' }, 409);
  }
  const created = await createUser(name, email, password);
  const token = await signToken({ id: created.id, email: created.email });
  // Newly created users are never admins by default.
  return c.json(
    {
      token,
      user: {
        id: created.id,
        email: created.email,
        name: created.name,
        isAdmin: false,
      },
    },
    201,
  );
});

authRouter.use('/me', authMiddleware);
authRouter.openapi(meRoute, async (c) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload = (c as any).get('jwtUser') as { id: number; email: string };
  const user = await findUserByEmail(payload.email);
  if (!user) return c.json({ error: 'User not found' }, 401);
  return c.json(
    { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin },
    200,
  );
});
