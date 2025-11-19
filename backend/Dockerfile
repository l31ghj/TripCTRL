# Use Debian-based image (NOT Alpine)
FROM node:22 AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma client
RUN npx prisma generate

# Build NestJS
RUN npm run build

# ---- Production Image ----
FROM node:22
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY prisma ./prisma

ENV NODE_ENV=production
EXPOSE 8000

# Run migrations then start API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
