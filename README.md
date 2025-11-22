# TripCTRL – Self-Hosted Travel Planner

TripCTRL is a self-hosted travel planning platform inspired by TripIt.

> **Current backend/frontend snapshot:** `0.1.0 – Core Trip Editing`
>
> This release focuses on:
> - Stable Prisma schema and migrations
> - Avoiding `prisma db push --accept-data-loss` in normal workflows
> - Clean local dev setup for backend + frontend
> - Simple Docker-based self-hosting
> - Polished trip list & detail views for day‑to‑day planning

## Stack

- **Backend:** Node.js, TypeScript, NestJS, Prisma, PostgreSQL
- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Infra:** Docker + docker-compose
- **CI:** GitHub Actions

---

## 1. Local Development

### 1.1. Clone & install

```bash
git clone https://github.com/l31ghj/TripCTRL.git
cd TripCTRL
```

### 1.2. Environment files

Create backend env:

```bash
cp backend/.env.example backend/.env
```

Create frontend env:

```bash
cp frontend/.env.example frontend/.env
```

Edit the values in each `.env` file to suit your setup.

---

## 2. Backend (NestJS + Prisma)

Backend lives in `backend/`.

### 2.1. Install dependencies

```bash
cd backend
npm install
```

### 2.2. Database

By default the repo is set up to use a local Postgres instance (or the `db`
service in `docker-compose.yml`).

Example `backend/.env`:

```dotenv
DATABASE_URL=postgresql://travel:travel@localhost:5432/travel_db?schema=public
JWT_SECRET=change-me
```

If you're using Docker, point `DATABASE_URL` at `db` instead of `localhost`:

```dotenv
DATABASE_URL=postgresql://travel:travel@db:5432/travel_db?schema=public
```

### 2.3. Prisma & migrations

From `backend/`:

```bash
# First time / whenever the schema changes:
npm run prisma:migrate-dev -- --name init_baseline_001
```

This will:

- Create a `prisma/migrations` folder
- Apply the schema in `prisma/schema.prisma` to the database
- **Avoid** using `prisma db push --accept-data-loss`

> ⚠️ For early development it’s fine to reset the database if needed:
>
> ```bash
> npx prisma migrate reset
> ```
>
> This is destructive and will wipe all data, but from the point you
> create `init_baseline_001` you should no longer need to use
> `--accept-data-loss` in normal development.

### 2.4. Run backend

```bash
npm run start:dev
```

The backend will listen on port **8000** with routes under `/api`, e.g.:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/trips`
- `POST /api/trips`
- etc.

---

## 3. Frontend (React + Vite)

Frontend lives in `frontend/`.

### 3.1. Install dependencies

```bash
cd frontend
npm install
```

### 3.2. API base URL

The frontend uses the `VITE_API_BASE` environment variable, falling back
to the current hostname on port 8000.

Example `frontend/.env`:

```dotenv
# Example: local dev backend
VITE_API_BASE=http://localhost:8000/api
```

For a LAN server:

```dotenv
VITE_API_BASE=http://192.168.68.131:8000/api
```

If `VITE_API_BASE` is not set, the default is:

- `http(s)://<current-hostname>:8000/api`

### 3.3. Run frontend (dev)

```bash
npm run dev
```

The dev server usually runs at <http://localhost:5173>.

### 3.4. Build frontend

```bash
npm run build
```

The resulting static bundle will be output in `dist/` (or a similar directory,
depending on your Docker/nginx configuration).

---

## 4. Docker

From the repo root:

```bash
docker compose up --build -d
```

This will start:

- PostgreSQL database (`db`)
- NestJS backend (`backend`, exposed on `8000`)
- Frontend (`frontend`, served on `3000`)

Then open:

- Frontend: `http://<server-ip>:3000`
- Backend API: `http://<server-ip>:8000/api`

The frontend is configured by default to call the backend at
`VITE_API_BASE`. In the Docker setup you typically want:

```dotenv
VITE_API_BASE=http://backend:8000/api
```

set in the frontend container environment.

---

## 5. Prisma usage guidelines

- Prefer `npm run prisma:migrate-dev` over `prisma db push`.
- Do **not** use `prisma db push --accept-data-loss` in normal development.
- If you need to wipe a dev database while you’re still iterating on the schema,
  use `npx prisma migrate reset` instead.

This keeps your database schema and migrations aligned and avoids surprises in
future releases.

---

## 6. Roadmap

High-level roadmap (see GitHub Issues for detailed tracking):

1. **0.0.1 – Consolidation & Stability** (this snapshot)
   - Stable schema & migrations
   - Clean local dev + Docker flow
2. **0.1.x – Core Trip Editing**
   - Improve trip and segment editing UX
3. **0.2.x – Attachments & Media**
   - Better file upload & attachment handling
4. **0.3.x – Collaboration (future)**
   - Shared trips / team features (TBD)

If you’re reading this on a branch or tagged release, check the GitHub Issues
and Milestones for the most up-to-date plan.
