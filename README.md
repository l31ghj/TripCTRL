# TripCTRL – Self-Hosted Travel Planner

TripCTRL is a self-hosted travel planning platform inspired by TripIt.

## Stack

- Backend: Node.js, TypeScript, NestJS, Prisma, PostgreSQL
- Frontend: React, TypeScript, Vite, Tailwind CSS
- Infra: Docker + docker-compose
- CI: GitHub Actions

## Development

Backend:

```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run start:dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Docker

From repo root:

```bash
docker compose up --build -d
```

Then open `http://<server-ip>:3000`.
