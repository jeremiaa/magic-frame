import { NextRequest, NextResponse } from "next/server";
import { getAppSettings, updateAppSettings } from "@/lib/settings/store";
import { supervisorHaCredentials } from "@/lib/runtime/addon";
import {
  verifySession,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getAppSettings();
    // Token sichtbar zurückgeben (Form-UI braucht ihn), aber Session-gated.
    try {
      await verifySession();
    } catch {
      // nicht eingeloggt -> nur leerer shell
      return NextResponse.json({ haUrl: "", haToken: "", immichUrl: "", immichApiKey: "" });
    }
    // Im Add-on kommt Home Assistant über den Supervisor-Proxy, ohne Token.
    // Ohne dieses Signal sieht die Oberfläche leere Felder und der Nutzer
    // schliesst daraus "nicht verbunden" — genau der Eindruck, der beim ersten
    // echten Add-on-Test entstanden ist. Der Token wird dabei NICHT
    // mitgeschickt: er ist der Supervisor-Token dieses Containers, gehört
    // niemandem in ein Formularfeld und wird beim Speichern ohnehin ignoriert.
    if (supervisorHaCredentials()) {
      return NextResponse.json({ ...s, haToken: "", haManagedBy: "supervisor" });
    }
    return NextResponse.json(s);
  } catch (err) {
    console.error("[settings] GET error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifySession();
    const body = await req.json();
    const patch: { haUrl?: string; haToken?: string; immichUrl?: string; immichApiKey?: string } = {};
    if (typeof body.haUrl === "string") patch.haUrl = body.haUrl.trim();
    if (typeof body.haToken === "string") patch.haToken = body.haToken;
    if (typeof body.immichUrl === "string") patch.immichUrl = body.immichUrl.trim();
    if (typeof body.immichApiKey === "string") patch.immichApiKey = body.immichApiKey;
    await updateAppSettings(patch);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    console.error("[settings] POST error:", err);
    return NextResponse.json(
      { error: "Failed", details: err?.message },
      { status: 500 },
    );
  }
}
