// sales-lead: receives form sign-ups and page events from the four sales sites.
// Public endpoint (verify_jwt off). Pages POST JSON as text/plain so browsers skip the CORS preflight.
//   {type:"event", kind, product, source, value, details}
//   {type:"lead", product, name, phone, telegram, email, company, lang, source, page, details, hp}
//   {type:"admin", code, whop?}  read or save the pay links (needs the setup code; used by the setup page)
// GET returns {ok, bot, whop}: the public settings the pages load (bot username, pay links).
// It also works as an uptime ping that keeps the free project awake.
import {
  background,
  clip,
  cleanDetails,
  notifyAdmins,
  PRODUCTS,
  saveSettings,
  sb,
  scrub,
  settings,
  sha256hex,
  type Lead,
} from "./sales.ts";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json; charset=utf-8" },
  });

const EVENT_KINDS = new Set([
  "view",
  "quiz_start",
  "quiz_done",
  "form_start",
  "cta_click",
  "calc_use",
  "share",
  "demo_click",
]);
const LANGS = new Set(["uz", "ru", "en"]);
const LEADS_PER_HOUR = 8;

// Cheap per-instance flood guard in front of the database.
const hits = new Map<string, { n: number; t: number }>();
function flooded(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || now - h.t > windowMs) {
    if (hits.size > 5000) hits.clear();
    hits.set(key, { n: 1, t: now });
    return false;
  }
  h.n++;
  return h.n > limit;
}

const WHOP_KEYS = ["trucktalkMonthly", "trucktalk3m", "dispatchKit"];

function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// deno-lint-ignore no-explicit-any
function botConfig(s: Record<string, string>): Record<string, any> {
  try {
    const c = s.bot_config ? JSON.parse(s.bot_config) : {};
    return c && typeof c === "object" && !Array.isArray(c) ? c : {};
  } catch {
    return {};
  }
}

function publicWhop(s: Record<string, string>): Record<string, string> {
  const w = botConfig(s).whop ?? {};
  const out: Record<string, string> = {};
  for (const k of WHOP_KEYS) if (typeof w[k] === "string" && /^https:\/\//.test(w[k])) out[k] = w[k];
  return out;
}

function clientIp(req: Request): string {
  const xff = (req.headers.get("x-forwarded-for") ?? "").split(",")[0];
  return (req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || xff || "unknown").trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  if (req.method === "GET") {
    try {
      const s = await settings();
      return json({ ok: true, service: "sales-lead", bot: s.bot_username || "", whop: publicWhop(s) });
    } catch (e) {
      console.error("sales-lead GET:", scrub(e));
      return json({ ok: false, service: "sales-lead" }, 500);
    }
  }
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const raw = await req.text();
    if (raw.length > 20_000) return json({ ok: false, error: "too_large" }, 413);
    let b: Record<string, unknown>;
    try {
      b = JSON.parse(raw);
    } catch {
      return json({ ok: false, error: "bad_json" }, 400);
    }
    if (!b || typeof b !== "object" || Array.isArray(b)) return json({ ok: false, error: "bad_json" }, 400);

    const ip = clientIp(req);
    const product = PRODUCTS.includes(String(b.product)) ? String(b.product) : "other";
    const source = clip(b.source, 40);

    /* ---------- setup page: pay links ---------- */
    if (b.type === "admin") {
      if (flooded("a:" + ip, 20, 600_000)) return json({ ok: false, error: "too_many_tries" }, 429);
      const s = await settings(true);
      const code = typeof b.code === "string" ? b.code.trim() : "";
      if (!s.setup_code || !code || !sameText(code, s.setup_code)) return json({ ok: false, error: "bad_code" }, 403);
      if (b.whop && typeof b.whop === "object" && !Array.isArray(b.whop)) {
        const cfg = botConfig(s);
        const whop: Record<string, string> = { ...(cfg.whop ?? {}) };
        for (const k of WHOP_KEYS) {
          const v = (b.whop as Record<string, unknown>)[k];
          if (v === undefined) continue;
          const url = String(v ?? "").trim();
          if (url && !/^https:\/\/[^\s"<>]{4,300}$/.test(url)) return json({ ok: false, error: "bad_url", field: k }, 400);
          whop[k] = url;
        }
        cfg.whop = whop;
        await saveSettings({ bot_config: JSON.stringify(cfg) });
        return json({ ok: true, saved: true, whop: publicWhop({ bot_config: JSON.stringify(cfg) }) });
      }
      return json({ ok: true, whop: publicWhop(s), bot: s.bot_username || "" });
    }

    /* ---------- page events ---------- */
    if (b.type === "event") {
      if (flooded("e:" + ip, 120)) return json({ ok: true, skipped: true });
      const kind = String(b.kind ?? "");
      if (!EVENT_KINDS.has(kind)) return json({ ok: false, error: "bad_kind" }, 400);
      const value = typeof b.value === "number" && Number.isFinite(b.value) ? b.value : null;
      const details = cleanDetails(b.details, 15);
      const { error } = await sb.from("sales_events").insert({ kind, product, source, value, details });
      if (error) {
        console.error("event insert:", error.message);
        return json({ ok: false, error: "server" }, 500);
      }
      return json({ ok: true });
    }

    /* ---------- sign-ups ---------- */
    if (b.type !== "lead") return json({ ok: false, error: "bad_type" }, 400);
    if (flooded("l:" + ip, 10)) return json({ ok: false, error: "rate_limited" }, 429);
    // Hidden field that only bots fill in: pretend it worked.
    if (typeof b.hp === "string" && b.hp.trim()) return json({ ok: true, id: 0 });

    const phone = clip(String(b.phone ?? "").replace(/[^\d+()\-\s.]/g, ""), 40);
    const telegram = clip(
      String(b.telegram ?? "").replace(/^(https?:\/\/)?(www\.)?(t\.me|telegram\.me)\//i, "").replace(/^@/, ""),
      64,
    );
    const email = clip(b.email, 120)?.toLowerCase() ?? null;
    const phoneOk = !!phone && phone.replace(/\D/g, "").length >= 7;
    if (!phoneOk && !telegram && !email) return json({ ok: false, error: "need_contact" }, 400);

    const s = await settings();
    const ip_hash = (await sha256hex((s.ip_salt ?? "") + ip)).slice(0, 32);
    const since = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await sb
      .from("sales_leads")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ip_hash)
      .gte("created_at", since);
    if ((count ?? 0) >= LEADS_PER_HOUR) return json({ ok: false, error: "rate_limited" }, 429);

    const row = {
      product,
      name: clip(b.name, 100),
      phone,
      telegram,
      email,
      company: clip(b.company, 120),
      lang: LANGS.has(String(b.lang)) ? String(b.lang) : null,
      source,
      page: clip(b.page, 300),
      details: cleanDetails(b.details, 30),
      ip_hash,
    };
    const { data, error } = await sb.from("sales_leads").insert(row).select("*").single();
    if (error || !data) {
      console.error("lead insert:", error?.message);
      return json({ ok: false, error: "server" }, 500);
    }
    const wait = background(notifyAdmins(data as Lead));
    if (wait) await wait;
    return json({ ok: true, id: data.id });
  } catch (e) {
    console.error("sales-lead:", scrub(e));
    return json({ ok: false, error: "server" }, 500);
  }
});
