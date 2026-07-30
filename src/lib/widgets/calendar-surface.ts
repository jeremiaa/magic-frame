// Zeichnet der Kalender seine eigene Karten-Fläche (Glass-Panel)?
// EINE Antwort für drei Konsumenten — Live-View-Host, Editor-Vorschau und
// das Widget selbst — sonst zeigen Host-Box und Widget-Panel doppelte oder
// gar keine Fläche. Nur die EXPLIZIT gewählten Panel-Ansichten zählen:
// Legacy-Configs (showEmptyDays ohne calendarView → Agenda-Verhalten) und
// die Listen-Ansicht rendern wie vor dem Karten-Umbau — ihre Fläche kommt
// von der Host-Box (Design "minimal") bzw. den Termin-Kacheln selbst.
export function calendarOwnSurface(config: any): boolean {
  const v = config?.calendarView;
  return v === "agenda" || v === "month";
}
