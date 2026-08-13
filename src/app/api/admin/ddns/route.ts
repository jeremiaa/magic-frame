import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdmin,
  ForbiddenError,
  forbiddenResponse,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";
import {
  getDdnsConfig,
  getDdnsState,
  setDdnsConfig,
  isProviderConfigured,
  type DdnsConfig,
} from "@/lib/ddns/store";
import { listProviderDescriptors, PROVIDER_NAMES } from "@/lib/ddns/providers";
import type { ProviderName } from "@/lib/ddns/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await verifyAdmin();
    const cfg = await getDdnsConfig();
    const state = await getDdnsState();
    return NextResponse.json({
      config: cfg,
      providers: listProviderDescriptors(),
      status: {
        enabled: cfg.enabled,
        configured: isProviderConfigured(cfg),
        currentIp: state.currentIp,
        lastIp: state.lastIp,
        lastCheck: state.lastCheck,
        lastUpdate: state.lastUpdate,
        lastError: state.lastError,
        intervalMin: cfg.intervalMin,
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof ForbiddenError) return forbiddenResponse();
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifyAdmin();
    const body = await req.json();
    const provider: ProviderName = PROVIDER_NAMES.includes(body.provider)
      ? body.provider
      : "cloudflare";

    // providerConfig kommt als { cloudflare: {...}, hetzner: {...}, generic: {...} }
    const incoming = (body.providerConfig ?? {}) as Record<string, Record<string, any>>;
    const sanitized: DdnsConfig["providerConfig"] = {};
    for (const name of PROVIDER_NAMES) {
      const bag = incoming[name];
      if (bag && typeof bag === "object") {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(bag)) {
          if (typeof v === "string") out[k] = v;
          else if (v == null) out[k] = "";
          else out[k] = String(v);
        }
        sanitized[name] = out;
      }
    }

    const next = await setDdnsConfig({
      enabled: !!body.enabled,
      provider,
      intervalMin: Number(body.intervalMin) || 5,
      providerConfig: sanitized,
    });
    return NextResponse.json({ ok: true, config: next });
  } catch (err: any) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof ForbiddenError) return forbiddenResponse();
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}
