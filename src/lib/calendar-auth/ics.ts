import ICAL from "ical.js";
import { plainText } from "./providers";

// Shared VEVENT expansion. Used by the plain iCal/webcal feeds in
// /api/calendar and by the CalDAV client — a CalDAV REPORT hands back one ICS
// document per calendar resource, so the same parsing, recurrence expansion
// and all-day handling applies there, just over many documents instead of one.

export type IcsEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
  description?: string;
  location?: string;
};

// #70: for DATE values (all-day) do NOT go through toJSDate()/toISOString —
// that pins the day to the server's timezone. The Y-M-D fields of the
// ICAL.Time already are the calendar day that was meant.
function stamp(t: any): string {
  if (t?.isDate) {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${t.year}-${p(t.month)}-${p(t.day)}T00:00:00`;
  }
  return t.toJSDate().toISOString();
}

/**
 * Parses one or more ICS documents and returns the events that overlap the
 * window, sorted by start and capped at `limit`.
 *
 * Each document is parsed as its own VCALENDAR, which is what makes TZID
 * references work: ical.js resolves them against the VTIMEZONE sitting in the
 * same component, so a CalDAV resource carrying its own timezone definition
 * lands on the right hour without any global registration.
 */
export function expandIcsEvents(
  sources: string | string[],
  windowStart: Date,
  windowEnd: Date,
  limit: number,
): IcsEvent[] {
  const documents = Array.isArray(sources) ? sources : [sources];
  const vevents: ICAL.Component[] = [];

  for (const raw of documents) {
    if (!raw || !raw.trim()) continue;
    let comp: ICAL.Component;
    try {
      comp = new ICAL.Component(ICAL.parse(raw));
    } catch (err) {
      // One unparsable resource must not take down the whole feed — CalDAV
      // servers can hand back the odd broken item among hundreds of good ones.
      console.error("Skipped unparsable calendar document", err);
      continue;
    }

    vevents.push(...comp.getAllSubcomponents("vevent"));
  }

  // BUG FIX 1: a recurring series that's had one occurrence edited/moved in
  // the source calendar (Google/iCloud/etc.) isn't stored as a single
  // VEVENT — it's a "master" VEVENT (the RRULE) plus a separate override
  // VEVENT sharing the same UID but carrying a RECURRENCE-ID, holding the
  // edited date/title. Treating every VEVENT as independent means the
  // master's plain iterator has no idea an override exists and still
  // generates the original, now-stale occurrence — while the override VEVENT
  // is *also* added as its own event, producing two visible entries for what
  // is really one edited event.
  //
  // ical.js resolves this correctly via relateException() — but that state
  // lives on the specific Event *instance* you call it on, so the exact
  // same instance must be the one used later for expansion.
  const masters = new Map<string, ICAL.Event>();
  const exceptionsByUid = new Map<string, ICAL.Component[]>();
  const singles: ICAL.Component[] = [];

  for (const vevent of vevents) {
    try {
      const ev = new ICAL.Event(vevent);
      if (ev.isRecurrenceException()) {
        const list = exceptionsByUid.get(ev.uid) ?? [];
        list.push(vevent);
        exceptionsByUid.set(ev.uid, list);
      } else if (ev.isRecurring()) {
        masters.set(ev.uid, ev);
      } else {
        singles.push(vevent);
      }
    } catch (err) {
      // BUG FIX 3: a single malformed/unusual VEVENT (common in large,
      // years-old calendars) must not take down parsing for the entire
      // feed — skip just this one entry and keep going.
      console.error("Skipped malformed calendar event during classification", err);
    }
  }

  // Relate each exception to its master (same instance stored above, so the
  // relation actually sticks for later expansion). If a master can't be
  // found in this feed (edge case — e.g. the series master got deleted but
  // an override survived), fall back to treating it as its own standalone
  // event using its own edited date, rather than silently dropping it.
  const orphanExceptions: ICAL.Component[] = [];
  for (const [uid, list] of exceptionsByUid) {
    const master = masters.get(uid);
    if (master) {
      for (const exVevent of list) master.relateException(exVevent);
    } else {
      orphanExceptions.push(...list);
    }
  }

  const events: IcsEvent[] = [];
  const windowStartIcal = ICAL.Time.fromJSDate(windowStart);
  const windowEndIcal = ICAL.Time.fromJSDate(windowEnd);

  const pushStandalone = (event: ICAL.Event) => {
    try {
      const startJS = event.startDate.toJSDate();
      const endJS = event.endDate.toJSDate();
      if (endJS >= windowStart && startJS <= windowEnd) {
        events.push({
          id: event.uid || Math.random().toString(),
          title: event.summary,
          start: stamp(event.startDate),
          end: stamp(event.endDate),
          isAllDay: event.startDate.isDate,
          description: plainText(event.description),
          location: plainText(event.location, 120),
        });
      }
    } catch (err) {
      console.error("Skipped malformed calendar event", err);
    }
  };

  // Recurring series — exceptions (if any) are already related on these
  // exact instances, so getOccurrenceDetails() below transparently returns
  // the edited data for an overridden date instead of the stale original,
  // with no separate entry needed for the override itself.
  for (const event of masters.values()) {
    try {
      const expand = event.iterator();
      let next;
      let iterations = 0;
      while ((next = expand.next()) && iterations < limit + 10) {
        iterations++;
        if (next.compare(windowStartIcal) < 0) continue;
        if (next.compare(windowEndIcal) > 0) break;

        const occurrence = event.getOccurrenceDetails(next);
        events.push({
          id: `${event.uid}-${next.toUnixTime()}`,
          title: occurrence.item.summary,
          start: stamp(occurrence.startDate),
          end: stamp(occurrence.endDate),
          isAllDay: occurrence.startDate.isDate,
          description: plainText(occurrence.item.description),
          location: plainText(occurrence.item.location, 120),
        });
      }
    } catch (err) {
      console.error("Skipped malformed calendar event", err);
    }
  }

  // Plain one-off events (never recurring, never an exception).
  for (const vevent of singles) {
    pushStandalone(new ICAL.Event(vevent));
  }

  // Orphaned exceptions — no master found in this feed, so show the edited
  // occurrence on its own rather than dropping it.
  for (const vevent of orphanExceptions) {
    pushStandalone(new ICAL.Event(vevent));
  }

  events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return events.slice(0, limit);
}
