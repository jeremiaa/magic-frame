FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate prisma client before build
RUN echo "DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy" > .env
RUN npx prisma generate
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

# tzdata: Alpine bringt keine Zoneinfo mit — ohne das Paket wird eine
# TZ-Env-Variable (Host-Timezone-Passthrough aus compose, #73) still
# ignoriert und der Container bleibt auf UTC.
RUN apk add --no-cache tzdata

ENV NODE_ENV production

# Ensure files are copied from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./server.js
# server.js lädt dieses Modul beim Start — fehlt es im Abbild, stirbt der
# Container mit MODULE_NOT_FOUND, bevor irgendetwas antwortet.
COPY --from=builder /app/server-ingress.js ./server-ingress.js
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/scripts ./scripts

# Schema push, Admin-Seed (wenn ENV gesetzt), dann Start.
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node scripts/bootstrap.mjs && node server.js"]
