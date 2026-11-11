/**
 * Läuft einmal beim Serverstart.
 *
 * Bisher nur für den Fernzugriff: Ein fester Cloudflare-Tunnel, der vor dem
 * Neustart lief, wird wieder aufgenommen. Wer nie einen eingerichtet hat, für
 * den passiert hier nichts ausser einer Datenbank-Abfrage.
 *
 * Nicht gewartet: der Start des Servers darf nie am Tunnel hängen.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // `next build` lädt diese Datei auch — dort gibt es nichts aufzunehmen.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { resumeTunnelIfConfigured } = await import("@/lib/tunnel/manager");
  void resumeTunnelIfConfigured().catch((err) => {
    console.warn("[tunnel] resume failed:", err instanceof Error ? err.message : err);
  });
}
