# SwamoraPlant

A mobile-first plant image capture system. Users sign in, point their camera at a plant, capture a photo, and send it for downstream processing.

```
Swamora/
├── SwamoraPlant.Server/   # HonoJS API — auth + image upload
├── SwamoraPlant.ui/       # React frontend — camera capture
└── docker-compose.yml     # Full stack (db + api + ui)
```

---

## Quick start — Docker (recommended)

Requires Docker and Docker Compose.

```bash
# From the repo root
docker compose up --build
```

The API container automatically applies the database schema and seeds the default account on first boot. No extra steps needed.

| Service  | URL                             |
|----------|---------------------------------|
| Frontend | http://localhost:5173           |
| API      | http://localhost:3000           |
| API docs | http://localhost:3000/reference |

Default login: `swamora@img.plant` / `abcd1234`

---

## Local development

Prerequisites: Node 20+, a PostgreSQL instance running locally.

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

Vite proxies all `/api` requests to `http://localhost:3000` in dev mode, so no frontend env var is needed.

---

## Running pieces independently

Each subproject has its own `docker-compose.yml`:

```bash
# Backend + DB only
cd SwamoraPlant.Server && docker compose up --build

# Frontend only (set VITE_API_BASE_URL to point at your API)
cd SwamoraPlant.ui && docker compose up --build
```

---

## Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Backend  | HonoJS · Drizzle ORM · PostgreSQL |
| Auth     | JWT (jose) · bcryptjs             |
| API docs | Scalar · OpenAPI 3.0              |
| Frontend | React 19 · Vite · TanStack Router |
| UI       | Tailwind v4 · shadcn/ui           |
