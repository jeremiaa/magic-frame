// Läuft VOR `prisma db push --accept-data-loss` und bricht ab, wenn die
// Datenbank von einer NEUEREN Magic-Frame-Version stammt als das laufende
// Abbild.
//
// Warum das nötig ist: `db push --accept-data-loss` gleicht die Datenbank
// bedingungslos an das Schema des Abbilds an. Vorwärts ist das genau richtig —
// eine neue Spalte kommt dazu, fertig. Rückwärts heisst dasselbe Kommando:
// jede Spalte und jede Tabelle, die die ältere Version nicht kennt, wird
// entfernt. Ohne Rückfrage, ohne Protokollzeile, die es als Verlust benennt.
//
// Und rückwärts geht man genau dann, wenn ohnehin schon etwas schiefläuft:
// nach einem missglückten Update auf das vorige Abbild zurück. Der Rückschritt
// soll den Ärger beenden, nicht die Ansichten löschen.
//
// Der Wächter ist bewusst schlicht: er merkt sich nach jedem erfolgreichen
// Abgleich die Version, die ihn gemacht hat, und vergleicht sie beim nächsten
// Start mit der eigenen. Keine Migrationsdateien, keine Schema-Prüfsumme —
// beides wäre eine grössere Umstellung, und die Frage hier ist nur "ist die
// Datenbank neuer als ich".
//
//   node scripts/schema-guard.mjs check   → vor dem Push. Exit 1 = Rückschritt.
//   node scripts/schema-guard.mjs stamp   → nach erfolgreichem Push.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const VERSION = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8")).version;
const MODE = process.argv[2] || "check";

/** "1.5.0" → [1,5,0]. Vorabversionen ("1.6.0-rc1") zählen als ihre Zahlen. */
function parts(v) {
  return String(v).split("-")[0].split(".").map((n) => parseInt(n, 10) || 0);
}
/** -1 = a älter, 0 = gleich, 1 = a neuer. */
function cmp(a, b) {
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0) ? 1 : -1;
  }
  return 0;
}

// Eigene Tabelle statt AppSettings: der Wächter läuft, BEVOR das Schema
// abgeglichen ist. Er darf sich also auf keine Spalte verlassen, die Prisma
// verwaltet — sonst scheitert genau der Fall, für den er da ist.
const DDL = `create table if not exists "_MagicFrameSchema" (
  id text primary key,
  version text not null,
  "updatedAt" timestamptz not null default now()
)`;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Ohne Datenbankadresse gibt es nichts zu bewachen — der Push scheitert
    // gleich danach ohnehin mit einer klaren Meldung.
    process.exit(0);
  }

  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
  } catch (e) {
    // Datenbank noch nicht bereit: nicht unsere Aufgabe. Der Push wartet und
    // meldet es selbst. Ein Wächter, der den Start wegen eines langsamen
    // Postgres verhindert, wäre schlimmer als das Problem.
    console.warn(`[schema-guard] database not reachable (${e.code || e.message}) — skipped.`);
    process.exit(0);
  }

  try {
    await client.query(DDL);

    if (MODE === "stamp") {
      await client.query(
        `insert into "_MagicFrameSchema" (id, version, "updatedAt") values ('global', $1, now())
         on conflict (id) do update set version = excluded.version, "updatedAt" = now()`,
        [VERSION],
      );
      process.exit(0);
    }

    const { rows } = await client.query(`select version from "_MagicFrameSchema" where id = 'global'`);
    const seen = rows[0]?.version;

    // Nichts vermerkt: entweder eine frische Datenbank oder eine aus der Zeit
    // vor dem Wächter. Beides ist kein Rückschritt — durchlassen und beim
    // Stempeln nachtragen.
    if (!seen) process.exit(0);

    if (cmp(seen, VERSION) === 1) {
      // Englisch, obwohl die Kommentare hier deutsch sind: das liest jemand im
      // Add-on-Protokoll oder in `docker compose logs`, in dem Moment, in dem
      // sein Frame nicht startet. Die Dokumentation, auf die es hinausläuft,
      // ist englisch, und die allermeisten Installationen laufen auf Englisch.
      console.error(
        [
          "",
          "  ┌──────────────────────────────────────────────────────────────┐",
          "  │  Magic Frame stopped on purpose, to protect your data.       │",
          "  └──────────────────────────────────────────────────────────────┘",
          "",
          `  This database was last used by version ${seen},`,
          `  but version ${VERSION} is starting.`,
          "",
          "  Going back to an older version would let the schema sync remove",
          "  everything the older version does not know about — views, widget",
          "  settings or calendar accounts would be gone. So it stops here,",
          "  before anything happens. Your data is untouched.",
          "",
          "  Two ways on:",
          "",
          `   • Start ${seen} or newer again — that runs straight away.`,
          "   • Really go back: restore a backup from that version's time",
          "     first, then the older version starts cleanly.",
          "",
          "  Only if you know what you are doing and the data loss is fine:",
          "  set MAGIC_FRAME_ALLOW_SCHEMA_DOWNGRADE=1.",
          "",
        ].join("\n"),
      );
      if (process.env.MAGIC_FRAME_ALLOW_SCHEMA_DOWNGRADE === "1") {
        console.error("  MAGIC_FRAME_ALLOW_SCHEMA_DOWNGRADE=1 is set — continuing anyway.\n");
        process.exit(0);
      }
      process.exit(1);
    }
    process.exit(0);
  } catch (e) {
    // Der Wächter darf niemals selbst der Grund sein, warum jemand nicht
    // starten kann. Kommt er nicht zurecht, sagt er es und tritt beiseite.
    console.warn(`[schema-guard] skipped: ${e.message}`);
    process.exit(0);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
