# TripCTRL – Self-Hosted Travel Planner

TripCTRL is a self-hosted travel planning platform.

## Stack

- Backend: Node.js, TypeScript, NestJS, Prisma, PostgreSQL
- Frontend: React, TypeScript, Vite, Tailwind CSS
- Infra: Docker + docker-compose
- CI: GitHub Actions

## Quick start (development)

```bash
# Backend
cd backend
npm install
npx prisma migrate dev --name init
npm run start:dev

# Frontend
cd ../frontend
npm install
npm run dev
```

Backend runs on `http://localhost:8000` (API prefix `/api`); frontend runs on `http://localhost:5173` in dev.

## Docker (self-hosted)

From the repo root:

```bash
docker compose up --build -d
```

This starts:
- Postgres (with persisted volume)
- Backend (NestJS + Prisma, runs migrations on startup)
- Frontend (static Vite build served by Nginx)

You should then be able to access the app via `http://localhost:3000`.

## Environment

See `backend/.env.example` for required env vars.
