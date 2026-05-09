# SwamoraPlant Server

HonoJS REST API for plant image collection. Handles JWT authentication and image upload.

## Stack

- **Runtime**: Node 20 (ESM)
- **Framework**: [HonoJS](https://hono.dev) + `@hono/zod-openapi`
- **Database**: PostgreSQL via [Drizzle ORM](https://orm.drizzle.team)
- **Auth**: JWT via [jose](https://github.com/panva/jose) · passwords via bcryptjs
- **Docs**: Scalar UI at `/reference`, raw OpenAPI spec at `/doc`

---

## Running without Docker

**Prerequisites:** Node 20+, a PostgreSQL database.

**1. Install dependencies**

```bash
npm install
```

**2. Configure environment**

```bash
cp .env.example .env
```

Edit `.env`:

| Variable          | Description                                  |
|-------------------|----------------------------------------------|
| `DATABASE_URL`    | `postgres://user:pass@localhost:5432/swamora` |
| `JWT_SECRET`      | Any long random string (`openssl rand -hex 32`) |
| `PORT`            | Port to listen on (default `3000`)           |
| `ALLOWED_ORIGINS` | Frontend origin(s), comma-separated          |

**3. Set up the database**

```bash
npm run db:push   # create / update tables
npm run db:seed   # insert the default account
```

**4. Start the server**

```bash
npm run dev       # hot reload — http://localhost:3000
# or
npm run start     # no hot reload
```

---

## Running with Docker (backend + DB only)

No local Node or PostgreSQL needed.

```bash
docker compose up --build
```

This starts:
- **`db`** — PostgreSQL 16 on port `5432`
- **`api`** — the server on port `3000`

On first boot the container automatically runs `db:push` and `db:seed`, so no extra steps are needed.

To stop and remove containers (data is preserved in the `pgdata` volume):

```bash
docker compose down
```

To also wipe the database volume:

```bash
docker compose down -v
```

---

## Scripts

```bash
npm run dev          # start with hot reload (tsx watch)
npm run start        # start without hot reload
npm run db:push      # push schema changes to the database
npm run db:generate  # generate Drizzle migration files
npm run db:seed      # seed the default user account
```

---

## Default account

| Field    | Value               |
|----------|---------------------|
| Email    | `swamora@img.plant` |
| Password | `abcd1234`          |

---

## API routes

| Method | Path                | Auth required | Description                |
|--------|---------------------|---------------|----------------------------|
| POST   | `/api/auth/login`   | No            | Sign in, returns JWT token |
| GET    | `/api/auth/me`      | Bearer token  | Get current user profile   |
| POST   | `/api/image/upload` | Bearer token  | Upload a plant image       |

Full interactive docs at `/reference` once the server is running.

---

## Database schema

Single `users` table:

| Column          | Type        |
|-----------------|-------------|
| `id`            | serial (PK) |
| `name`          | text        |
| `email`         | text unique |
| `password_hash` | text        |
| `created_at`    | timestamp   |
