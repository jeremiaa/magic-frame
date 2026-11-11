FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
# Leer für das normale Abbild. Nur das Add-on-Abbild wird mit dem Platzhalter
# gebaut, den scripts/mf-basepath.mjs beim Containerstart durch den echten
# Ingress-Pfad ersetzt. Siehe next.config.ts.
ARG MF_BASE_PATH=""
ENV MF_BASE_PATH=$MF_BASE_PATH
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate prisma client before build
RUN echo "DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy" > .env
RUN npx prisma generate
RUN npm run build

# cloudflared für den eingebauten Fernzugriff (Einstellungen → Hosting &
# Netzwerk). Die App startet und beaufsichtigt das Programm selbst; im Abbild
# liegt es, damit dafür zur Laufzeit nichts aus dem Internet geladen und
# ausgeführt werden muss — und damit genau die Fassung ausgeliefert wird, mit
# der getestet wurde.
#
# Fest auf eine Version genagelt und gegen die Prüfsumme aus dem GitHub-Release
# geprüft. Cloudflare unterstützt Fassungen rund ein Jahr: beim Anheben beide
# Summen aus `gh api repos/cloudflare/cloudflared/releases/latest` übernehmen.
#
# `uname -m` statt TARGETARCH: das stimmt beim nativen Bau, unter Emulation
# und auch mit dem alten Builder, der TARGETARCH nicht kennt. Für andere
# Architekturen gibt es kein cloudflared — dann bleibt /out leer und die
# Oberfläche sagt, dass der Fernzugriff hier fehlt.
FROM base AS cloudflared
ARG CLOUDFLARED_VERSION=2026.10.7
ARG CLOUDFLARED_SHA256_AMD64=1f99fb518b83dec2ba8d870a7cc991d82a77e6196295a3d2754ba17ab9f91872
ARG CLOUDFLARED_SHA256_ARM64=3df43aedc9ff291d1735b5cb576cb97e0b157488796db2e32b28aecabb445775
RUN set -eu; mkdir -p /out; \
    case "$(uname -m)" in \
      x86_64) arch=amd64; sum="$CLOUDFLARED_SHA256_AMD64" ;; \
      aarch64) arch=arm64; sum="$CLOUDFLARED_SHA256_ARM64" ;; \
      *) echo "no cloudflared build for $(uname -m) — remote access will be unavailable in this image"; exit 0 ;; \
    esac; \
    url="https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/cloudflared-linux-${arch}"; \
    n=0; until wget -q -T 60 -O /out/cloudflared "$url"; do \
      n=$((n+1)); [ "$n" -lt 3 ] || { echo "could not download $url"; exit 1; }; sleep 5; \
    done; \
    echo "${sum}  /out/cloudflared" | sha256sum -c -; \
    chmod 0755 /out/cloudflared

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
# Dasselbe gilt für den Tunnel-Eingang.
COPY --from=builder /app/server-tunnel.js ./server-tunnel.js
COPY --from=cloudflared /out/ /usr/local/bin/
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/scripts ./scripts

# Schema push, Admin-Seed (wenn ENV gesetzt), dann Start.
# schema-guard läuft VOR dem Push: `--accept-data-loss` würde beim Zurückgehen
# auf ein älteres Abbild alles entfernen, was die ältere Version nicht kennt.
# Der Wächter bricht in dem Fall ab, statt zu löschen; nach erfolgreichem Push
# vermerkt `stamp` die Version, gegen die beim nächsten Start verglichen wird.
CMD ["sh", "-c", "node scripts/schema-guard.mjs check && npx prisma db push --accept-data-loss && node scripts/schema-guard.mjs stamp && node scripts/bootstrap.mjs && node server.js"]
