import { NextRequest, NextResponse } from "next/server";
import { dismissTimer } from "@/lib/timers/store";

// Wegwischen ist die Sache des Bildschirms, auf dem es steht. Diese Route hat
// einen Nutzer verlangt, ihn dann aber nie verwendet — dismiss* bekommt nur
// die id, es wurde also nichts auf eine Person eingegrenzt, sondern nur die
// Tür zugehalten. Auf einem Wandtablett ohne Anmeldung hiess das: das X tat
// nichts, und die Karte war beim nächsten Abruf wieder da.

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await dismissTimer(id);

  if ((global as any).LIVE_SYNC_IO) {
    (global as any).LIVE_SYNC_IO.emit("TIMER_DISMISSED", { id });
  }

  return NextResponse.json({ ok: true });
}
