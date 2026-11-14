// Shared helpers for the sales-lead and sales-bot Edge Functions.
// supabase/sync-shared.sh copies this file into each function folder before deploy,
// because each function is bundled on its own.
import { createClient } from "jsr:@supabase/supabase-js@2";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

export const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const PRODUCTS = ["trucktalk", "dispatch", "dslhelp", "centers", "ielts", "other"];
export const STATUSES = ["new", "contacted", "trial", "paid", "lost"];

export const PRODUCT_LABEL: Record<string, string> = {
  trucktalk: "🚛 Truck Talk",
  dispatch: "🧭 Dispatch",
  dslhelp: "🛠 DSL HELP",
  centers: "🎓 SpeakUp for centers",
  ielts: "📝 IELTS CD Prep",
  other: "📌 Other",
};

export const STATUS_LABEL: Record<string, string> = {
  new: "🟡 New",
  contacted: "📞 Contacted",
  trial: "🧪 Trial",
  paid: "💰 Paid",
  lost: "❌ Lost",
};

export type Lead = {
  id: number;
  created_at?: string;
  product: string;
  name: string | null;
  phone: string | null;
  telegram: string | null;
  email: string | null;
  company: string | null;
  lang: string | null;
  source: string | null;
  page: string | null;
  details: Record<string, unknown>;
  status: string;
  tg_chat_id: number | null;
};

/* ---------------- settings (key/value table, cached briefly) ---------------- */

type Settings = Record<string, string>;
let cache: { at: number; map: Settings } | null = null;

export async function settings(fresh = false): Promise<Settings> {
  if (!fresh && cache && Date.now() - cache.at < 30_000) return cache.map;
  const { data, error } = await sb.from("sales_settings").select("key,value");
  if (error) throw new Error("settings: " + error.message);
  const map: Settings = {};
  for (const r of data ?? []) map[r.key as string] = (r.value as string) ?? "";
  cache = { at: Date.now(), map };
  return map;
}

export async function saveSettings(values: Record<string, string>): Promise<void> {
  const now = new Date().toISOString();
  const rows = Object.entries(values).map(([key, value]) => ({ key, value, updated_at: now }));
  const { error } = await sb.from("sales_settings").upsert(rows);
  if (error) throw new Error("saveSettings: " + error.message);
  cache = null;
}

/* ---------------- text helpers ---------------- */

export function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** One-line value: control characters and repeated spaces removed. */
export function clip(v: unknown, n: number): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return s ? s.slice(0, n) : null;
}

/** Multi-line value: keeps line breaks, removes other control characters. */
export function clipText(v: unknown, n: number): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v)
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return s ? s.slice(0, n) : null;
}

export function cleanDetails(d: unknown, maxKeys = 30): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!d || typeof d !== "object" || Array.isArray(d)) return out;
  let n = 0;
  for (const [k0, v] of Object.entries(d as Record<string, unknown>)) {
    if (n >= maxKeys) break;
    const k = String(k0).replace(/[^\w.-]/g, "_").slice(0, 40);
    if (!k) continue;
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "boolean") out[k] = v;
    else if (Array.isArray(v)) {
      const s = clipText(v.map((x) => String(x)).join(", "), 500);
      if (!s) continue;
      out[k] = s;
    } else if (typeof v === "string") {
      const s = clipText(v, 1000);
      if (!s) continue;
      out[k] = s;
    } else continue;
    n++;
  }
  return out;
}

export function isUsername(s: string | null | undefined): boolean {
  return !!s && /^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(s);
}

/** Best guess at a full international number, only used for the WhatsApp button. */
export function waNumber(phone: string | null, product: string): string | null {
  if (!phone) return null;
  const plus = phone.trim().startsWith("+");
  const d = phone.replace(/\D/g, "");
  if (plus) return d.length >= 8 ? d : null;
  if (d.length === 9 && (product === "centers" || product === "ielts")) return "998" + d;
  if (d.length === 10 && !/^[01]/.test(d)) return "1" + d;
  if (d.length >= 11) return d;
  return null;
}

export async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomHex(bytes = 16): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Never let a bot token reach the logs. */
export function scrub(e: unknown): string {
  const s = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  return s.replace(/bot\d+:[A-Za-z0-9_-]+/g, "bot<token>").replace(/\d{6,12}:[A-Za-z0-9_-]{30,}/g, "<token>");
}

/** Run work after the response is sent when the runtime allows it. */
export function background(p: Promise<unknown>): Promise<unknown> | undefined {
  const safe = p.catch((e) => console.error("background task failed:", scrub(e)));
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt && typeof rt.waitUntil === "function") {
    rt.waitUntil(safe);
    return undefined;
  }
  return safe;
}

/* ---------------- Telegram ---------------- */

// deno-lint-ignore no-explicit-any
export type TgResult = { ok: boolean; result?: any; description?: string; error_code?: number };

export async function tg(method: string, payload: Record<string, unknown> = {}, token?: string): Promise<TgResult> {
  const t = token ?? (await settings()).tg_token;
  if (!t) return { ok: false, description: "bot is not set up yet" };
  try {
    const r = await fetch(`https://api.telegram.org/bot${t}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = (await r.json()) as TgResult;
    if (!j.ok) console.warn(`telegram ${method} failed: ${j.error_code} ${j.description}`);
    return j;
  } catch (e) {
    console.error(`telegram ${method} error: ${scrub(e)}`);
    return { ok: false, description: scrub(e) };
  }
}

/* ---------------- lead cards for admins ---------------- */

export function leadText(l: Lead): string {
  const out: string[] = [];
  out.push(`${l.status === "new" ? "🔔" : "📋"} <b>Lead #${l.id}</b> · ${esc(PRODUCT_LABEL[l.product] ?? l.product)}`);
  if (l.name) out.push(`👤 ${esc(l.name)}`);
  if (l.company) out.push(`🏢 ${esc(l.company)}`);
  if (l.phone) out.push(`📞 <code>${esc(l.phone)}</code>`);
  if (l.telegram) out.push(`✈️ ${isUsername(l.telegram) ? "@" + esc(l.telegram) : esc(l.telegram)}`);
  if (l.email) out.push(`✉️ ${esc(l.email)}`);
  const det = Object.entries(l.details ?? {}).filter(([, v]) => v !== "" && v !== null && v !== undefined);
  if (det.length) {
    out.push("");
    for (const [k, v] of det.slice(0, 25)) out.push(`• ${esc(k.replace(/_/g, " "))}: ${esc(String(v).slice(0, 300))}`);
  }
  out.push("");
  const meta = [l.lang ? l.lang.toUpperCase() : "", l.source ? `from ${l.source}` : "", l.page ?? ""].filter(Boolean).join(" · ");
  if (meta) out.push(`<i>${esc(meta)}</i>`);
  if (l.tg_chat_id) out.push("<i>Came through the bot: reply to this card to message them.</i>");
  out.push(`Status: <b>${esc(STATUS_LABEL[l.status] ?? l.status)}</b>`);
  return out.join("\n");
}

export function leadKeyboard(l: Lead) {
  const b = (s: string) => ({ text: (l.status === s ? "✓ " : "") + STATUS_LABEL[s], callback_data: `st:${l.id}:${s}` });
  // deno-lint-ignore no-explicit-any
  const rows: any[][] = [[b("contacted"), b("trial")], [b("paid"), b("lost")]];
  const links: { text: string; url: string }[] = [];
  if (isUsername(l.telegram)) links.push({ text: "✈️ Telegram", url: `https://t.me/${l.telegram}` });
  const wa = waNumber(l.phone, l.product);
  if (wa) links.push({ text: "🟢 WhatsApp", url: `https://wa.me/${wa}` });
  if (links.length) rows.push(links);
  return { inline_keyboard: rows };
}

export async function adminIds(): Promise<number[]> {
  const { data, error } = await sb.from("sales_bot_users").select("chat_id").eq("is_admin", true).eq("blocked", false);
  if (error) console.error("adminIds:", error.message);
  return (data ?? []).map((r) => Number(r.chat_id));
}

export async function sendLeadCard(chatId: number, l: Lead): Promise<boolean> {
  const r = await tg("sendMessage", {
    chat_id: chatId,
    text: leadText(l),
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: leadKeyboard(l),
  });
  if (!r.ok) return false;
  await sb.from("sales_bot_msgmap").insert({
    admin_chat_id: chatId,
    admin_message_id: r.result.message_id,
    user_chat_id: l.tg_chat_id,
    lead_id: l.id,
  });
  return true;
}

export async function notifyAdmins(l: Lead): Promise<void> {
  const s = await settings();
  if (!s.tg_token) return;
  for (const id of await adminIds()) await sendLeadCard(id, l);
}
