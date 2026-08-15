#!/usr/bin/env sh
# Magic Frame als Home-Assistant-Add-on.
#
# Anders als bei docker compose gibt es hier nur EINEN Container, also läuft
# Postgres mit im selben. Alles Dauerhafte liegt unter /data — das ist das
# einzige Verzeichnis, das ein Update und einen Neustart überlebt.
set -e

DATA_DIR=/data
PGDATA="${DATA_DIR}/postgres"
PGUSER=postgres
DB_NAME=magicdashboard
SECRET_FILE="${DATA_DIR}/session_secret"

log() { echo "[magic-frame] $*"; }

# ── Anhalten ────────────────────────────────────────────────────────────────
# WICHTIG: Hier weder `set -e` noch offene Signale.
#
# Beim Prototyp stand hier ein blankes `kill` unter `set -e`. War der Prozess
# schon weg, lieferte kill einen Fehler, das Skript brach MITTEN im Aufräumen
# ab — und Postgres wurde nie sauber angehalten. Ergebnis beim nächsten Start:
# "database system was not properly shut down". Genau deshalb steht hier
# `set +e` und ein Trap, der weitere Signale verschluckt.
stop() {
  trap '' TERM INT
  set +e
  log "Wird angehalten…"
  if [ -n "${APP_PID}" ]; then
    kill "${APP_PID}" 2>/dev/null
    wait "${APP_PID}" 2>/dev/null
  fi
  # -m fast: laufende Verbindungen trennen, aber sauber schreiben.
  su-exec "${PGUSER}" pg_ctl -D "${PGDATA}" -m fast stop 2>/dev/null
  log "Angehalten."
  exit 0
}
trap stop TERM INT

# ── Datenbank ───────────────────────────────────────────────────────────────
mkdir -p "${PGDATA}"
chown -R "${PGUSER}:${PGUSER}" "${PGDATA}"
chmod 700 "${PGDATA}"

if [ ! -s "${PGDATA}/PG_VERSION" ]; then
  log "Datenbank wird zum ersten Mal angelegt…"
  su-exec "${PGUSER}" initdb -D "${PGDATA}" -E UTF8 --locale=C >/dev/null
fi

# Nur über den Unix-Socket erreichbar: Die Datenbank gehört zum Add-on und
# hat im Netz nichts verloren.
log "Datenbank wird gestartet…"
su-exec "${PGUSER}" pg_ctl -D "${PGDATA}" -o "-c listen_addresses='' -c unix_socket_directories=/tmp" -w -t 60 start

if ! su-exec "${PGUSER}" psql -h /tmp -lqt | cut -d\| -f1 | grep -qw "${DB_NAME}"; then
  log "Datenbank ${DB_NAME} wird angelegt…"
  su-exec "${PGUSER}" createdb -h /tmp "${DB_NAME}"
fi

# ── Sitzungsschlüssel ───────────────────────────────────────────────────────
# Muss über Neustarts hinweg gleich bleiben, sonst ist nach jedem Neustart
# jeder ausgeloggt. Deshalb in /data, nicht als Umgebungsvariable.
if [ ! -s "${SECRET_FILE}" ]; then
  head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n' > "${SECRET_FILE}"
  chmod 600 "${SECRET_FILE}"
fi
SESSION_SECRET="$(cat "${SECRET_FILE}")"
export SESSION_SECRET

# ── Einstellungen aus der Add-on-Konfiguration ──────────────────────────────
if [ -f /data/options.json ]; then
  ADMIN_EMAIL="$(sed -n 's/.*"admin_email"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' /data/options.json)"
  ADMIN_PASSWORD="$(sed -n 's/.*"admin_password"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' /data/options.json)"
  TZ_OPT="$(sed -n 's/.*"timezone"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' /data/options.json)"
  # Boolean, also ohne Anführungszeichen im JSON. Kein sed mit Alternation:
  # `\|` ist eine GNU-Erweiterung und fehlt in busybox/BSD sed.
  HA_UNRESTRICTED="$(grep -o '"ha_action_unrestricted"[^,}]*' /data/options.json | grep -c true || true)"
  [ -n "${ADMIN_EMAIL}" ] && export ADMIN_EMAIL
  [ -n "${ADMIN_PASSWORD}" ] && export ADMIN_PASSWORD
  [ -n "${TZ_OPT}" ] && export TZ="${TZ_OPT}"
  [ "${HA_UNRESTRICTED}" = "1" ] && export MAGIC_FRAME_HA_ACTION_UNRESTRICTED=1
  HA_AUTOLOGIN_OFF="$(grep -o '"ha_auto_login"[^,}]*' /data/options.json | grep -c false || true)"
  [ "${HA_AUTOLOGIN_OFF}" = "1" ] && export MAGIC_FRAME_HA_AUTO_LOGIN=0
fi

# ── Zeitzone ────────────────────────────────────────────────────────────────
# Der Supervisor setzt TZ in JEDEM Add-on-Container bereits auf die Zeitzone
# von Home Assistant (supervisor/docker/app.py, ENV_TIME). Hier ist also nichts
# zu holen — die Option daneben ueberschreibt sie, mehr braucht es nicht.
#
# Der erste Versuch fragte http://supervisor/core/info ab. Das war gleich
# doppelt falsch: die Route verlangt hassio_api, wir haben nur
# homeassistant_api — und curl fehlte im Abbild, der Aufruf waere ohnehin nie
# gelaufen. Beides faellt still aus, weshalb es aufgefallen waere: gar nicht.
if [ -n "${TZ:-}" ]; then
  log "Zeitzone: ${TZ}"
else
  log "Zeitzone: keine gesetzt — es gilt UTC. Ueber die Add-on-Option aenderbar."
fi

export DATABASE_URL="postgresql://${PGUSER}@localhost/${DB_NAME}?host=/tmp&schema=public"
export NODE_ENV=production
# Der Erkennungsmarker der App ist /data/options.json (immer vorhanden), aber
# wir setzen es zusätzlich ausdrücklich — dann steht es auch im Log richtig.
export MAGIC_FRAME_ADDON=1

# ── Seitenleisten-Eingang (Ingress) ─────────────────────────────────────────
# Der Listener in server-ingress.js startet nur, wenn dieser Port gesetzt ist.
# 8099 ist der ingress_port aus config.yaml; er steht nicht unter `ports:` und
# wird darum nie auf dem Host veröffentlicht — nur HAs Ingress-Gateway kommt
# hin. Die Startseite braucht ausserdem den VERÖFFENTLICHTEN Port der App,
# denn dorthin schickt sie den Browser weiter. Der Nutzer kann 8098 im
# Netzwerk-Teil der Add-on-Einstellungen umlegen, deshalb fragen wir den
# Supervisor statt die Zahl fest zu verdrahten.
export MAGIC_FRAME_INGRESS_PORT=8099
PUBLIC_PORT="$(curl -sf -H "Authorization: Bearer ${SUPERVISOR_TOKEN}" http://supervisor/addons/self/info \
  | grep -o '"3000/tcp"[[:space:]]*:[[:space:]]*[0-9]*' | grep -o '[0-9]*$' || true)"
export MAGIC_FRAME_PUBLIC_PORT="${PUBLIC_PORT:-8098}"

# ── App ─────────────────────────────────────────────────────────────────────
cd /app
log "Schema wird abgeglichen…"
npx prisma db push --accept-data-loss
node scripts/bootstrap.mjs

log "Magic Frame läuft auf Port 3000 (von aussen ${MAGIC_FRAME_PUBLIC_PORT})."
node server.js &
APP_PID=$!
wait "${APP_PID}"
