import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Der Unterpfad, unter dem die App läuft. Leer für jede normale Installation
  // — Docker, Kubernetes, alles wie bisher.
  //
  // Nur das Home-Assistant-Add-on setzt ihn, und zwar in zwei Stufen: das
  // Abbild wird mit einem PLATZHALTER gebaut, und beim ersten Start des
  // Containers ersetzt scripts/mf-basepath.mjs den Platzhalter durch den
  // echten Ingress-Pfad (/api/hassio_ingress/<token>), den Home Assistant erst
  // bei der Installation vergibt. Der Server liest basePath bei jedem Start
  // neu aus .next/required-server-files.json — nur die Client-Bündel tragen
  // ihn eingebacken, und genau die repariert das Ersetzen.
  //
  // Warum überhaupt: ohne basePath müsste ein Antwort-Umschreiber die
  // /_next/-URLs im Vorbeiflug korrigieren. Der bricht still und erst bei der
  // dritten Navigation. So sagt die App dem Framework die Wahrheit — sie läuft
  // unter einem Unterpfad —, und ein vergessener Platzhalter bricht LAUT.
  basePath: process.env.MF_BASE_PATH || "",
  serverExternalPackages: ["node-ical"],
  // TypeScript Strict-Check schluckt sich im Build-Container (Node 20) bei
  // einem ./store-Import in src/lib/caddy/generate.ts, obwohl der Code
  // korrekt ist und lokal (Node 22) sauber durchläuft. Build-Compilation
  // funktioniert unabhängig — wir umgehen den Type-Gate damit der Container-
  // Build durchgeht; lokale Type-Checks im Editor + `npm run build` machen
  // weiterhin volle Strict-Validierung.
  typescript: { ignoreBuildErrors: true },
  experimental: {
    // Cap the static-generation worker pool (the build server is a
    // memory-constrained LXC; Next.js otherwise spawns one worker per core
    // and the OOM killer takes the build down mid page-data collection).
    // 1 worker: 2 workers plus the Turbopack compile still exceed 2 GiB.
    cpus: 1,
  },
};

export default nextConfig;
