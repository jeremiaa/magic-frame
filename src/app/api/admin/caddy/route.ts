import { NextRequest, NextResponse } from "next/server";
import {
  verifySession,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";
import {
  getCaddyConfig,
  setCaddyConfig,
  getCaddyState,
  type CaddyConfig,
} from "@/lib/caddy/store";
import { generateCaddyfile } from "@/lib/caddy/generate";
import {
  writeAndReload,
  fetchCaddyStatus,
  readCurrentCaddyfile,
  caddyfileMtime,
} from "@/lib/caddy/admin";
import {
  CADDY_DNS_PROVIDER_NAMES,
  listCaddyProviderDescriptors,
  type CaddyDnsProviderName,
} from "@/lib/caddy/providers";
import { isAddonMode } from "@/lib/runtime/addon";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await verifySession();
    // Als HA-Add-on gibt es kein mitgeliefertes Caddy — der Supervisor macht
    // Proxy und HTTPS. Wir melden das, damit die Oberfläche gar nicht erst
    // Felder anbietet, die nichts bewirken würden.
    if (isAddonMode()) {
      return NextResponse.json({ addonMode: true });
    }
    const cfg = await getCaddyConfig();
    const state = await getCaddyState();
    const status = await fetchCaddyStatus();
    const current = await readCurrentCaddyfile();
    const mtime = await caddyfileMtime();
    return NextResponse.json({
      config: cfg,
      providers: listCaddyProviderDescriptors(),
      status: {
        ...status,
        lastReload: state.lastReload,
        lastError: state.lastError,
        caddyfileMtime: mtime,
      },
      caddyfile: current,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (isAddonMode()) {
    return NextResponse.json(
      { error: "Im Home-Assistant-Add-on übernimmt der Supervisor Proxy und HTTPS." },
      { status: 400 },
    );
  }
  try {
    await verifySession();
    const body = await req.json().catch(() => ({}));

    // providerConfig pro bekannten Provider sanitisieren — alle anderen Felder
    // wegwerfen, damit niemand random keys reinschmuggeln kann.
    let providerConfig: CaddyConfig["providerConfig"] | undefined;
    if (body.providerConfig && typeof body.providerConfig === "object") {
      providerConfig = {};
      for (const name of CADDY_DNS_PROVIDER_NAMES) {
        const bag = body.providerConfig[name];
        if (bag && typeof bag === "object") {
          const out: Record<string, string> = {};
          for (const [k, v] of Object.entries(bag)) {
            out[k] = v == null ? "" : typeof v === "string" ? v : String(v);
          }
          providerConfig[name] = out;
        }
      }
    }

    const patch: Partial<CaddyConfig> = {
      enabled: !!body.enabled,
      mode: body.mode === "custom" ? "custom" : "managed",
      domain: typeof body.domain === "string" ? body.domain.trim() : undefined,
      acmeEmail: typeof body.acmeEmail === "string" ? body.acmeEmail.trim() : undefined,
      challenge: body.challenge === "http" ? "http" : body.challenge === "dns" ? "dns" : undefined,
      dnsProvider: CADDY_DNS_PROVIDER_NAMES.includes(body.dnsProvider as any)
        ? (body.dnsProvider as CaddyDnsProviderName)
        : undefined,
      redirectHttp: body.redirectHttp === undefined ? undefined : !!body.redirectHttp,
      extraDomains: Array.isArray(body.extraDomains)
        ? body.extraDomains
            .map((s: any) => String(s).trim())
            .filter((s: string) => s.length > 0)
        : undefined,
      providerConfig,
      customCaddyfile:
        typeof body.customCaddyfile === "string" ? body.customCaddyfile : undefined,
    };
    const next = await setCaddyConfig(patch);
    const { caddyfile, warnings } = await generateCaddyfile(next);
    const reload = await writeAndReload(caddyfile);
    return NextResponse.json({
      ok: reload.ok,
      reloaded: reload.reloaded,
      error: reload.error,
      config: next,
      caddyfile,
      warnings,
    });
  } catch (err: any) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}
