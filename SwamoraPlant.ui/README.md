# SwamoraPlant UI

Mobile-first React frontend for plant image capture. Sign in, use your camera to capture a plant photo, and send it to the backend for processing.

## Stack

- **Framework**: [React 19](https://react.dev) + [Vite 8](https://vite.dev)
- **Routing**: [TanStack Router](https://tanstack.com/router) (file-based)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) · [shadcn/ui](https://ui.shadcn.com)
- **Auth**: JWT stored in localStorage, axios interceptor auto-attaches the token
- **State**: [Zustand](https://zustand.docs.pmnd.rs)
- **Font**: Geist Variable

---

## Running without Docker

**Prerequisites:** Node 20+, the backend API running somewhere (locally or Docker).

**1. Install dependencies**

```bash
npm install
```

**2. Configure environment** (optional for local dev)

```bash
cp .env.example .env
```

| Variable            | Description                                                     |
|---------------------|-----------------------------------------------------------------|
| `VITE_API_BASE_URL` | Only needed for production builds. Leave empty in development.  |

> In dev mode, Vite automatically proxies all `/api` requests to `http://localhost:3000`. You only need this env var if you're pointing at a remote API.

**3. Start the dev server**

```bash
npm run dev    # → http://localhost:5173
```

The backend must be running on port `3000` (or wherever your `VITE_API_BASE_URL` points).

**Other commands:**

```bash
npm run build    # production build → dist/
npm run preview  # serve the production build locally
npm run lint     # ESLint
```

---

## Running with Docker (frontend only)

Builds the app and serves it via nginx on port `5173`. The API must be running and reachable.

**If your API is running locally:**

```bash
# Pass the API URL as a build argument
docker compose up --build
```

By default the `docker-compose.yml` sets `VITE_API_BASE_URL` to `http://localhost:3000`. Edit that file if your API is elsewhere.

**If you want nginx to proxy `/api` automatically** (i.e. the API is also in Docker), use the root `docker-compose.yml` from the repo root instead — it wires everything together.

```bash
# From repo root
docker compose up --build
```

To stop:

```bash
docker compose down
```

---

## Routes

| Path     | Description                               |
|----------|-------------------------------------------|
| `/login` | Sign-in form                              |
| `/`      | Camera capture + image upload (protected) |

---

## Camera features

- Requests the rear (`environment`) camera by default on mobile
- After camera permission is granted, detects how many video inputs are available — shows a **Switch Camera** button when there is more than one
- Captures a JPEG frame, shows a preview, then uploads via `POST /api/image/upload`

---

## Design

Paper and botanical aesthetic: warm parchment background, white cards, deep forest green accents, Geist font. Light mode by default.
