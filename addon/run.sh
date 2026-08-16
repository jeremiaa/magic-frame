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
  # EXIT MIT verschlucken: stop() endet selbst mit `exit`, und ohne das hier
  # riefe der EXIT-Trap sich rekursiv wieder auf.
  trap '' TERM INT EXIT
  set +e
  log "Wird angehalten…"
  if [ -n "${APP_PID}" ]; then
    kill "${APP_PID}" 2>/dev/null
    wait "${APP_PID}" 2>/dev/null
  fi
  # -m fast: laufende Verbindungen trennen, aber sauber schreiben.
  su-exec "${PGUSER}" pg_ctl -D "${PGDATA}" -m fast stop 2>/dev/null
  log "Angehalten."
  exit "${1:-0}"
}
# TERM/INT ist der Supervisor, der anhält oder sichert. EXIT ist der Fall, den
# es vorher nicht gab: stirbt die App von selbst — ein Absturz, ein fehlender
# Schlüssel, ein abgelehnter Schema-Abgleich —, lief das Skript einfach aus und
# Postgres wurde NIE angehalten. Beim nächsten Start stand dann "database
# system was not properly shut down" im Protokoll, und Postgres musste erst
# wiederherstellen. Jetzt wird in jedem Fall sauber geschlossen.
trap stop TERM INT
trap 'stop $?' EXIT

# ── Datenbank ───────────────────────────────────────────────────────────────
mkdir -p "${PGDATA}"
chown -R "${PGUSER}:${PGUSER}" "${PGDATA}"
chmod 700 "${PGDATA}"

# Fertig ist ein Cluster erst, wenn global/pg_control da ist — DAS schreibt
# initdb zuletzt. PG_VERSION taugt dafür nicht: es entsteht als eine der ERSTEN
# Dateien, nach rund 50 ms eines Laufs, der auf einer SD-Karte Sekunden dauert.
#
# Genau daran ist die erste Fassung dieser Rettung gescheitert, nachgemessen im
# echten Alpine-Abbild: ein Abbruch im Fenster zwischen beiden Dateien hinterließ
# ein PG_VERSION mit gültigem Inhalt — die Rettung sprang nicht an, initdb
# sprang nicht an, und pg_ctl scheiterte an der fehlenden pg_control. Also
# wieder die Endlosschleife, gegen die das hier gebaut war.
if [ ! -s "${PGDATA}/PG_VERSION" ] || [ ! -s "${PGDATA}/global/pg_control" ]; then
  # Nicht leer heißt: da liegt ein abgebrochener Aufbau. Er wird beiseite
  # gelegt, nicht gelöscht — mit Zeitstempel, damit eine ZWEITE Rettung die
  # erste nicht vernichtet. Die erste ist die gefährliche: dort können echte
  # Daten liegen, wenn nicht der Erstaufbau, sondern eine gewachsene Datenbank
  # beschädigt wurde.
  if [ -d "${PGDATA}" ] && [ -n "$(ls -A "${PGDATA}" 2>/dev/null)" ]; then
    BROKEN="${DATA_DIR}/postgres.unfertig.$(date +%Y%m%d-%H%M%S)"
    log "Die Datenbank in ${PGDATA} ist unvollständig (kein global/pg_control)."
    log "Sie wird nach ${BROKEN} verschoben — nichts wird gelöscht, ältere Rettungen bleiben liegen."
    mv "${PGDATA}" "${BROKEN}"
    mkdir -p "${PGDATA}"
    chown -R "${PGUSER}:${PGUSER}" "${PGDATA}"
    chmod 700 "${PGDATA}"
  fi
  log "Datenbank wird zum ersten Mal angelegt…"
  su-exec "${PGUSER}" initdb -D "${PGDATA}" -E UTF8 --locale=C >/dev/null
fi

# Die Datenbankdateien gehören zu genau einer Postgres-Hauptversion. Wandert
# das Basis-Abbild irgendwann von 16 auf 17, startet pg_ctl das bestehende
# Verzeichnis nicht mehr — und ohne diese Prüfung liefe das Add-on in eine
# Neustartschleife mit einer Meldung, die niemand als Versionssprung liest.
PG_HAVE="$(cat "${PGDATA}/PG_VERSION" 2>/dev/null || true)"
PG_BIN="$(su-exec "${PGUSER}" pg_ctl --version 2>/dev/null | tr -dc '0-9. ' | tr ' ' '\n' | grep -m1 '[0-9]' | cut -d. -f1 || true)"
if [ -n "${PG_HAVE}" ] && [ -n "${PG_BIN}" ] && [ "${PG_HAVE}" != "${PG_BIN}" ]; then
  log "ABBRUCH: Die Daten in ${PGDATA} gehören zu PostgreSQL ${PG_HAVE}, dieses Add-on bringt ${PG_BIN} mit."
  log "Deine Daten sind unberührt. Bitte eine Sicherung einspielen oder die vorige Add-on-Version starten."
  exit 1
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
# Gelesen wird mit node, nicht mit sed. sed kann kein JSON, und das ist hier
# keine Feinheit gewesen: ein Passwort mit einem Anführungszeichen zerlegte den
# Ausdruck und kam verstümmelt an — man tippte danach dasselbe Passwort ein und
# kam nicht hinein. Umlaute schreibt der Supervisor als \u00e4, das blieb als
# Text stehen. Und `.*` ist gierig, bei mehreren Schlüsseln in einer Zeile
# stand also der falsche Wert drin. node liegt ohnehin im Abbild.
#
# Die Werte gehen über eine Datei mit Anführungszeichen von node selbst gesetzt,
# damit kein Sonderzeichen unterwegs eine Shell-Bedeutung bekommt.
OPTS_ENV=/tmp/mf-options.env
if [ -f /data/options.json ]; then
  # Der Zielpfad kommt als ARGUMENT, nicht über die Umgebung: eine nicht
  # exportierte Variable ist in node schlicht undefined, und dann schreibt es
  # ins Leere, ohne dass hier etwas auffällt. Genau das ist beim Testen passiert.
  node -e '
    const fs = require("fs");
    const target = process.argv[1];
    let o = {};
    try { o = JSON.parse(fs.readFileSync("/data/options.json", "utf8")); }
    catch (e) { console.error("[addon] options.json ist nicht lesbar: " + e.message); }
    const sh = (v) => "\x27" + String(v).replace(/\x27/g, "\x27\\\x27\x27") + "\x27";
    const out = [];
    const str = (k, name) => {
      const v = o[k];
      if (typeof v === "string" && v !== "") out.push(name + "=" + sh(v));
    };
    str("admin_email", "OPT_ADMIN_EMAIL");
    str("admin_password", "OPT_ADMIN_PASSWORD");
    str("timezone", "OPT_TZ");
    out.push("OPT_HA_UNRESTRICTED=" + (o.ha_action_unrestricted === true ? "1" : "0"));
    out.push("OPT_HA_AUTOLOGIN=" + (o.ha_auto_login === false ? "0" : "1"));
    out.push("OPT_SIDEBAR_MODE=" + (o.sidebar_mode === "launcher" ? "launcher" : "embedded"));
    fs.writeFileSync(target, out.join("\n") + "\n", { mode: 0o600 });
  ' "${OPTS_ENV}" || log "Optionen konnten nicht gelesen werden — es gelten die Vorgaben."

  if [ -f "${OPTS_ENV}" ]; then
    # shellcheck disable=SC1090
    . "${OPTS_ENV}"
    rm -f "${OPTS_ENV}"
  fi

  [ -n "${OPT_ADMIN_EMAIL:-}" ] && export ADMIN_EMAIL="${OPT_ADMIN_EMAIL}"
  [ -n "${OPT_ADMIN_PASSWORD:-}" ] && export ADMIN_PASSWORD="${OPT_ADMIN_PASSWORD}"
  [ -n "${OPT_TZ:-}" ] && export TZ="${OPT_TZ}"
  [ "${OPT_HA_UNRESTRICTED:-0}" = "1" ] && export MAGIC_FRAME_HA_ACTION_UNRESTRICTED=1
  [ "${OPT_HA_AUTOLOGIN:-1}" = "0" ] && export MAGIC_FRAME_HA_AUTO_LOGIN=0
  export MAGIC_FRAME_SIDEBAR_MODE="${OPT_SIDEBAR_MODE:-embedded}"
  true
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
# Jeder lange Startschritt läuft im HINTERGRUND und wird mit `wait` abgewartet.
# Der Grund ist eine Eigenheit der Shell: solange sie auf ein Kommando im
# VORDERGRUND wartet, führt sie einen Trap nicht aus — sie merkt sich das Signal
# und arbeitet es erst danach ab. Ein SIGTERM vom Supervisor (Anhalten, oder der
# Beginn einer Sicherung) bliebe also für die Dauer des Schema-Abgleichs liegen,
# und der kann auf einem Pi dauern. `wait` dagegen ist unterbrechbar.
schritt() {
  BESCHREIBUNG="$1"; shift
  "$@" &
  STEP_PID=$!
  wait "${STEP_PID}"
  RC=$?
  if [ "${RC}" -ne 0 ]; then
    log "ABBRUCH bei: ${BESCHREIBUNG} (Rückgabewert ${RC})"
    exit "${RC}"
  fi
}

log "Schema wird abgeglichen…"
# Siehe scripts/schema-guard.mjs: bricht ab, wenn die Datenbank von einer
# neueren Version stammt, statt beim Rückschritt stillschweigend zu löschen.
schritt "Schema-Wächter" node scripts/schema-guard.mjs check
schritt "Schema-Abgleich" npx prisma db push --accept-data-loss
schritt "Schema-Stempel" node scripts/schema-guard.mjs stamp
schritt "Erststart-Einrichtung" node scripts/bootstrap.mjs

log "Magic Frame läuft auf Port 3000 (von aussen ${MAGIC_FRAME_PUBLIC_PORT})."
node server.js &
APP_PID=$!
wait "${APP_PID}"
