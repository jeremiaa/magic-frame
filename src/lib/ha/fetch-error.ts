/**
 * Verständliche Meldung für einen fehlgeschlagenen Aufruf an Home Assistant.
 *
 * Node wirft bei Verbindungsproblemen immer nur "fetch failed" — der echte
 * Grund steckt in err.cause und ging bisher verloren. Genau daran ist #64
 * hängen geblieben: 500 im Browser, "fetch failed" in der Oberfläche, und
 * weder bei uns noch in HA ein Log, weil die Verbindung nie ankam.
 */
export function describeHaFetchError(err: any): string {
  const cause: any = err?.cause ?? {};
  const code: string = cause.code || err?.code || "";
  const detail: string = cause.message || err?.message || "Unbekannter Fehler";

  switch (code) {
    case "ENOTFOUND":
    case "EAI_AGAIN":
      // Zweiter Absatz aus #64: Wenn der eigene Resolver die AAAA-Anfrage mit
      // NXDOMAIN statt NODATA beantwortet, wirft musl (Alpine) den kompletten
      // Lookup weg — obwohl der A-Record sauber auflöst. dig und curl gehen
      // nicht durch getaddrinfo und funktionieren deshalb weiter, was den
      // Fehler wie ein Magic-Frame-Problem aussehen lässt.
      return `Hostname nicht auflösbar (${detail}). Läuft Magic Frame in Docker, kennt der Container weder .local-Namen noch deinen lokalen DNS-Eintrag — hier hilft die IP-Adresse. Löst der Name im Container per dig/curl auf und trotzdem steht hier ENOTFOUND: prüf, ob dein DNS-Server auf die AAAA-Anfrage NXDOMAIN statt NODATA antwortet — dann scheitert der Lookup trotz gültigem A-Record.`;
    case "ECONNREFUSED":
      return `Verbindung abgewiesen (${detail}). Adresse und Port stimmen vermutlich nicht, oder etwas dazwischen blockt.`;
    case "EHOSTUNREACH":
    case "ENETUNREACH":
      return `Host nicht erreichbar (${detail}). Aus dem Container heraus führt kein Weg zu dieser Adresse.`;
    case "ECONNRESET":
      return `Verbindung abgebrochen (${detail}). Häufig, wenn https auf einen http-Port zeigt oder umgekehrt.`;
    case "DEPTH_ZERO_SELF_SIGNED_CERT":
    case "SELF_SIGNED_CERT_IN_CHAIN":
    case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
    case "ERR_TLS_CERT_ALTNAME_INVALID":
      return `TLS-Zertifikat wird nicht akzeptiert (${detail}). Der Browser kennt die Ausnahme, der Server nicht — mit http im lokalen Netz oder einem gültigen Zertifikat läuft es.`;
    default:
      break;
  }

  if (err?.name === "TimeoutError" || /aborted due to timeout/i.test(String(err?.message))) {
    return "Zeitüberschreitung — Home Assistant hat nicht geantwortet. Adresse erreichbar? Bei .local-Namen im Container die IP nehmen.";
  }
  return code ? `${detail} (${code})` : detail;
}
