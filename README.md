# SwamoraPlant

A mobile-first plant image capture system. Users sign in, point their camera at a plant, capture a photo, and send it for downstream processing.

```
Swamora/
├── SwamoraPlant.Server/   # HonoJS API — auth + image upload
├── SwamoraPlant.ui/       # React frontend — camera capture
├── docker-compose.yml     # Full stack (api + ui)
└── render.yaml            # Render deployment config
```

---

## Quick start — Docker (recommended)

Requires Docker and Docker Compose.

**1. Create your `.env` file from the example:**

```bash
cp .env.example .env
```

Open `.env` and set `DATABASE_URL` to your Supabase or external Postgres connection string:

```
# Supabase — use the DIRECT connection (port 5432, not the pooled 6543)
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

**2. Start the stack:**

```bash
docker compose up --build
```

The container automatically applies the database schema and seeds the default account on first boot.

| URL                             | Description     |
|---------------------------------|-----------------|
| http://localhost:3000           | App + API       |
| http://localhost:3000/reference | API docs        |

Default login: `swamora@img.plant` / `abcd1234`

---

## Local development (no Docker)

Prerequisites: Node 20+.

**1. Backend**

```bash
cd SwamoraPlant.Server
cp .env.example .env   # set DATABASE_URL and JWT_SECRET
npm install
npm run db:push        # create tables
npm run db:seed        # insert default account
npm run dev            # → http://localhost:3000
```

**2. Frontend** (separate terminal)

```bash
cd SwamoraPlant.ui
npm install
npm run dev            # → http://localhost:5173
```

Vite proxies all `/api` requests to `http://localhost:3000` in dev mode.

---

## Deploying to Render

The `render.yaml` at the repo root has everything Render needs.

**Steps:**

1. Push this repo to GitHub.
2. In the [Render dashboard](https://render.com), create a new **Web Service** and connect your GitHub repo. Render will detect `render.yaml` automatically.
3. Set the following environment variables in the Render dashboard (or edit `render.yaml`):

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Supabase direct-connection URL (port 5432) |
| `JWT_SECRET` | Auto | Render generates a random value on first deploy |
| `GROQ_API_KEY` | No | Leave blank to run Savi chat in demo mode |
| `GOOGLE_MAPS_API_KEY` | No | Server-side key for the shops endpoint |
| `VITE_GOOGLE_MAPS_API_KEY` | No | Baked into the React bundle at build time |
| `VITE_GOOGLE_MAPS_MAP_ID` | No | Baked into the React bundle at build time |
| `ALLOWED_ORIGINS` | No | Only needed if you add a separate client on a different domain |

4. Deploy. The container will run migrations and seed the DB on startup.

The server pings itself every 20 minutes (`/api/ping`) to prevent Render's free tier from spinning down.

---

## Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Backend  | HonoJS · Drizzle ORM · PostgreSQL |
| Auth     | JWT (jose) · bcryptjs             |
| API docs | Scalar · OpenAPI 3.0              |
| Frontend | React 19 · Vite · TanStack Router |
| UI       | Tailwind v4 · shadcn/ui           |
