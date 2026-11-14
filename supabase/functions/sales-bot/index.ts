// sales-bot: one Telegram bot that sells all four offers and works as the lead inbox.
//   POST /sales-bot/setup   {code, token}  connect a BotFather token (from the setup page)
//   POST /sales-bot/status  {code}         check the connection
//   POST /sales-bot                        Telegram webhook (secret header checked)
// Customers: language pick, product screens, prices, short sign-up flows, free-text questions.
// Admins (/start admin_<setup code>): lead cards with status buttons, replies relayed to customers,
// /leads, /stats, /lead_<id>.
import {
  adminIds,
  clip,
  clipText,
  esc,
  type Lead,
  leadKeyboard,
  leadText,
  notifyAdmins,
  PRODUCT_LABEL,
  randomHex,
  saveSettings,
  sb,
  scrub,
  sendLeadCard,
  settings,
  STATUS_LABEL,
  STATUSES,
  SUPABASE_URL,
  tg,
  type TgResult,
} from "./sales.ts";
import { allLangs, type Cfg, DEFAULT_CFG, type Lang, LANGS, priceVars, t } from "./texts.ts";

/* ---------------- types ---------------- */

type TgUser = { id: number; is_bot?: boolean; first_name?: string; last_name?: string; username?: string; language_code?: string };
type TgMessage = {
  message_id: number;
  from?: TgUser;
  chat: { id: number; type: string };
  text?: string;
  caption?: string;
  contact?: { phone_number: string; user_id?: number };
  reply_to_message?: TgMessage;
};
type TgCallback = { id: string; from: TgUser; message?: TgMessage; data?: string };
type BotUser = {
  chat_id: number;
  username: string | null;
  first_name: string | null;
  lang: Lang | null;
  product: string | null;
  state: string | null;
  // deno-lint-ignore no-explicit-any
  state_data: Record<string, any>;
  is_admin: boolean;
  source: string | null;
  blocked: boolean;
};

/* ---------------- constants ---------------- */

const CODE_TO_PRODUCT: Record<string, string> = { tt: "trucktalk", disp: "dispatch", dsl: "dslhelp", lc: "centers", ielts: "ielts" };

const FLOWS: Record<string, string[]> = {
  tt: ["tt_time", "tt_level", "phone"],
  disp: ["disp_info", "phone"],
  dsl: ["dsl_trucks", "dsl_company", "phone"],
  lc: ["lc_students", "lc_center", "phone"],
  ielts: ["ielts_who", "phone"],
};
const TEXT_STEPS = new Set(["disp_info", "dsl_company", "lc_center"]);

// Button answers: value -> [label key or literal, English label stored on the lead]
const CHOICES: Record<string, { v: string; key?: string; label?: string; en: string }[]> = {
  tt_time: [
    { v: "morning", key: "o_morning", en: "Mornings" },
    { v: "evening", key: "o_evening", en: "Evenings" },
    { v: "weekend", key: "o_weekend", en: "Weekends" },
  ],
  tt_level: [
    { v: "lvl0", key: "o_lvl0", en: "None yet" },
    { v: "lvl1", key: "o_lvl1", en: "A little" },
    { v: "lvl2", key: "o_lvl2", en: "Can talk" },
  ],
  dsl_trucks: [
    { v: "1-10", label: "1–10", en: "1–10" },
    { v: "11-25", label: "11–25", en: "11–25" },
    { v: "26-100", label: "26–100", en: "26–100" },
    { v: "100p", label: "100+", en: "100+" },
  ],
  lc_students: [
    { v: "50", label: "≤ 50", en: "up to 50" },
    { v: "150", label: "51–150", en: "51–150" },
    { v: "300", label: "151–300", en: "151–300" },
    { v: "300p", label: "300+", en: "300+" },
  ],
  ielts_who: [
    { v: "student", key: "o_student", en: "IELTS candidate" },
    { v: "teacher", key: "o_teacher", en: "Teacher" },
    { v: "center", key: "o_center", en: "Learning center" },
  ],
};
const DETAIL_KEY: Record<string, string> = {
  tt_time: "time",
  tt_level: "level",
  disp_info: "mc_and_truck",
  dsl_trucks: "trucks",
  lc_students: "students",
  ielts_who: "who",
};

const ADMIN_COMMANDS = [
  { command: "leads", description: "Last 10 leads" },
  { command: "stats", description: "Numbers for the last 7 days" },
  { command: "menu", description: "See the bot as a customer" },
  { command: "lang", description: "Change language" },
];

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json; charset=utf-8" } });

/* ---------------- small helpers ---------------- */

function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const btn = (text: string, data: string) => ({ text, callback_data: data });
const urlBtn = (text: string, url: string) => ({ text, url });
const appBtn = (text: string, url: string) => ({ text, web_app: { url } });

function pageLink(base: string | undefined, path: string, l: Lang): string | null {
  if (!base) return null;
  return `${base.replace(/\/+$/, "")}/${path}?src=bot&lang=${l}`;
}

function guessLang(code: string | undefined, product: string | null): Lang {
  const c = (code ?? "").slice(0, 2).toLowerCase();
  if (c === "uz") return "uz";
  if (["ru", "kk", "ky", "tg", "be", "uk", "az", "tk"].includes(c)) return "ru";
  if (product === "dispatch" || product === "dslhelp") return "en";
  if (product) return "uz";
  return c === "en" ? "en" : "uz";
}

function fullName(u?: TgUser): string {
  return [u?.first_name, u?.last_name].filter(Boolean).join(" ").trim();
}

function cleanPhone(s: string): string | null {
  const raw = s.replace(/[^\d+]/g, "");
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return (raw.startsWith("+") || digits.length >= 11 ? "+" : "") + digits;
}

function ago(ts: string): string {
  const m = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

let cfgCache: { at: number; cfg: Cfg } | null = null;
async function cfg(): Promise<Cfg> {
  if (cfgCache && Date.now() - cfgCache.at < 30_000) return cfgCache.cfg;
  const s = await settings();
  let over: Partial<Cfg> = {};
  try {
    over = s.bot_config ? JSON.parse(s.bot_config) : {};
  } catch {
    console.warn("bot_config is not valid JSON, using defaults");
  }
  const c: Cfg = {
    sites: { ...DEFAULT_CFG.sites, ...(over.sites ?? {}) },
    demos: { ...DEFAULT_CFG.demos, ...(over.demos ?? {}) },
    whop: { ...DEFAULT_CFG.whop, ...(over.whop ?? {}) },
    prices: { ...DEFAULT_CFG.prices, ...(over.prices ?? {}) },
  };
  cfgCache = { at: Date.now(), cfg: c };
  return c;
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const raw = await req.text();
  if (raw.length > 4000) return {};
  try {
    const j = JSON.parse(raw);
    return j && typeof j === "object" && !Array.isArray(j) ? j : {};
  } catch {
    return {};
  }
}

/* ---------------- Telegram send helpers ---------------- */

async function send(chatId: number, text: string, markup?: unknown): Promise<TgResult> {
  const r = await tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(markup ? { reply_markup: markup } : {}),
  });
  if (!r.ok && r.error_code === 403) await sb.from("sales_bot_users").update({ blocked: true }).eq("chat_id", chatId);
  return r;
}

/** Replace the screen the button was on; send a new message if that fails. */
async function show(cq: TgCallback | null, chatId: number, text: string, markup?: unknown): Promise<TgResult> {
  if (cq?.message) {
    const r = await tg("editMessageText", {
      chat_id: chatId,
      message_id: cq.message.message_id,
      text,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      ...(markup ? { reply_markup: markup } : {}),
    });
    if (r.ok || /not modified/i.test(r.description ?? "")) return r;
  }
  return send(chatId, text, markup);
}

async function mapMsg(adminChat: number, adminMsg: number, userChat: number | null, leadId: number | null = null) {
  await sb.from("sales_bot_msgmap").insert({ admin_chat_id: adminChat, admin_message_id: adminMsg, user_chat_id: userChat, lead_id: leadId });
}

/* ---------------- users ---------------- */

async function loadUser(from: TgUser): Promise<BotUser> {
  const { data } = await sb.from("sales_bot_users").select("*").eq("chat_id", from.id).maybeSingle();
  if (data) {
    const patch: Partial<BotUser> = {};
    if ((from.username ?? null) !== data.username) patch.username = from.username ?? null;
    if ((from.first_name ?? null) !== data.first_name) patch.first_name = from.first_name ?? null;
    if (data.blocked) patch.blocked = false;
    if (Object.keys(patch).length) await sb.from("sales_bot_users").update(patch).eq("chat_id", from.id);
    return { ...(data as BotUser), ...patch, state_data: (data.state_data ?? {}) as Record<string, unknown> };
  }
  const row: BotUser = {
    chat_id: from.id,
    username: from.username ?? null,
    first_name: from.first_name ?? null,
    lang: null,
    product: null,
    state: null,
    state_data: {},
    is_admin: false,
    source: null,
    blocked: false,
  };
  await sb.from("sales_bot_users").upsert(row, { onConflict: "chat_id", ignoreDuplicates: true });
  return row;
}

async function saveUser(u: BotUser, patch: Partial<BotUser>): Promise<void> {
  Object.assign(u, patch);
  const { error } = await sb.from("sales_bot_users").update(patch).eq("chat_id", u.chat_id);
  if (error) console.error("saveUser:", error.message);
}

function langOf(u: BotUser, from?: TgUser): Lang {
  return u.lang && LANGS.includes(u.lang) ? u.lang : guessLang(from?.language_code, u.product);
}

/* ---------------- screens ---------------- */

function menuScreen(l: Lang, name: string) {
  return {
    text: t(l, "menu_hi", { name: name ? ", " + esc(name) : "" }),
    kb: {
      inline_keyboard: [
        [btn(t(l, "b_tt"), "p:tt")],
        [btn(t(l, "b_disp"), "p:disp")],
        [btn(t(l, "b_dsl"), "p:dsl")],
        [btn(t(l, "b_lc"), "p:lc")],
        [btn(t(l, "b_ielts"), "p:ielts")],
        [btn(t(l, "b_lang"), "lang:")],
      ],
    },
  };
}

function productScreen(code: string, l: Lang, c: Cfg) {
  const v = priceVars(c, l);
  // deno-lint-ignore no-explicit-any
  const rows: any[][] = [];
  const site = (key: string) => pageLink(c.sites[key], "", l);
  if (code === "tt") {
    rows.push([btn(t(l, "b_su_tt"), "su:tt")]);
    const quiz = pageLink(c.sites.trucktalk, "check/", l);
    if (quiz) rows.push([appBtn(t(l, "b_test"), quiz)]);
    rows.push([btn(t(l, "b_prices"), "pr:tt"), btn(t(l, "b_ask"), "ask:tt")]);
    const links = [];
    const s = site("trucktalk");
    if (s) links.push(urlBtn(t(l, "b_site"), s));
    if (c.demos.trucktalkApp) links.push(urlBtn(t(l, "b_app"), c.demos.trucktalkApp));
    if (links.length) rows.push(links);
  } else if (code === "disp") {
    rows.push([btn(t(l, "b_su_disp"), "su:disp")]);
    rows.push([btn(t(l, "b_prices"), "pr:disp"), btn(t(l, "b_ask"), "ask:disp")]);
    const s = site("dispatch");
    if (s) rows.push([urlBtn(t(l, "b_site"), s)]);
  } else if (code === "dsl") {
    rows.push([btn(t(l, "b_su_dsl"), "su:dsl")]);
    rows.push([btn(t(l, "b_prices"), "pr:dsl"), btn(t(l, "b_ask"), "ask:dsl")]);
    const s = site("dslhelp");
    if (s) rows.push([urlBtn(t(l, "b_site"), s)]);
  } else if (code === "lc") {
    rows.push([btn(t(l, "b_su_lc"), "su:lc")]);
    const demos = [];
    if (c.demos.speakup1) demos.push(urlBtn(t(l, "b_demo_sp1"), c.demos.speakup1));
    if (c.demos.ielts) demos.push(urlBtn(t(l, "b_demo_ielts"), c.demos.ielts));
    if (demos.length) rows.push(demos);
    rows.push([btn(t(l, "b_prices"), "pr:lc"), btn(t(l, "b_ask"), "ask:lc")]);
    const s = site("centers");
    if (s) rows.push([urlBtn(t(l, "b_site"), s)]);
  } else if (code === "ielts") {
    rows.push([btn(t(l, "b_su_ielts"), "su:ielts")]);
    if (c.demos.ielts) rows.push([urlBtn(t(l, "b_demo_ielts"), c.demos.ielts)]);
    rows.push([btn(t(l, "b_prices"), "pr:ielts"), btn(t(l, "b_ask"), "ask:ielts")]);
  }
  rows.push([btn(t(l, "b_lang"), "lang:" + code), btn(t(l, "b_menu"), "menu")]);
  return { text: t(l, "intro_" + code, v), kb: { inline_keyboard: rows } };
}

function pricesScreen(code: string, l: Lang, c: Cfg) {
  return {
    text: t(l, "prices_" + code, priceVars(c, l)),
    kb: {
      inline_keyboard: [
        [btn(t(l, "b_su_" + code), "su:" + code)],
        [btn(t(l, "b_back"), "p:" + code), btn(t(l, "b_menu"), "menu")],
      ],
    },
  };
}

function langScreen(back: string) {
  return {
    text: t("en", "choose_lang"),
    kb: {
      inline_keyboard: [
        [btn("🇺🇿 O'zbekcha", `lang:${back}:uz`)],
        [btn("🇷🇺 Русский", `lang:${back}:ru`)],
        [btn("🇬🇧 English", `lang:${back}:en`)],
      ],
    },
  };
}

/* ---------------- sign-up flow ---------------- */

async function askStep(chatId: number, l: Lang, step: string, cq: TgCallback | null) {
  const cancel = [btn(t(l, "b_cancel"), "cancel")];
  if (step === "phone") {
    return send(chatId, t(l, "q_phone"), {
      keyboard: [[{ text: t(l, "b_share_phone"), request_contact: true }], [{ text: t(l, "b_skip") }, { text: t(l, "b_cancel") }]],
      resize_keyboard: true,
      one_time_keyboard: true,
      input_field_placeholder: "+1 555 123 4567",
    });
  }
  if (TEXT_STEPS.has(step)) return show(cq, chatId, t(l, "q_" + step), { inline_keyboard: [cancel] });
  const opts = CHOICES[step] ?? [];
  const rows = opts.map((o) => [btn(o.key ? t(l, o.key) : (o.label ?? o.v), `a:${step}:${o.v}`)]);
  rows.push(cancel);
  return show(cq, chatId, t(l, "q_" + step), { inline_keyboard: rows });
}

async function startSignup(u: BotUser, chatId: number, code: string, l: Lang, cq: TgCallback | null) {
  const flow = FLOWS[code];
  if (!flow) return;
  await saveUser(u, { state: flow[0], state_data: { flow: code, a: {} }, product: CODE_TO_PRODUCT[code] });
  await askStep(chatId, l, flow[0], cq);
}

async function nextStep(u: BotUser, chatId: number, l: Lang, from: TgUser, cq: TgCallback | null) {
  const sd = u.state_data ?? {};
  const flow = FLOWS[sd.flow as string];
  if (!flow || !u.state) return;
  const next = flow[flow.indexOf(u.state) + 1];
  if (!next) return finishSignup(u, chatId, l, from, null);
  await saveUser(u, { state: next, state_data: sd });
  await askStep(chatId, l, next, cq);
}

async function finishSignup(u: BotUser, chatId: number, l: Lang, from: TgUser, phone: string | null) {
  const sd = u.state_data ?? {};
  const code = String(sd.flow ?? "");
  const product = CODE_TO_PRODUCT[code] ?? "other";
  const a = (sd.a ?? {}) as Record<string, string>;
  const details: Record<string, string> = {};
  for (const [step, val] of Object.entries(a)) {
    if (step === "dsl_company" || step === "lc_center") continue;
    const choice = (CHOICES[step] ?? []).find((o) => o.v === val);
    details[DETAIL_KEY[step] ?? step] = choice ? choice.en : val;
  }
  const row = {
    product,
    name: clip(fullName(from), 100),
    phone,
    telegram: from.username ?? null,
    email: null,
    company: clip(a.dsl_company ?? a.lc_center ?? null, 120),
    lang: l,
    source: u.source ?? "telegram",
    page: "telegram-bot",
    details,
    tg_chat_id: chatId,
  };
  const { data: lead, error } = await sb.from("sales_leads").insert(row).select("*").single();
  if (error) console.error("bot lead insert:", error.message);
  await saveUser(u, { state: null, state_data: {} });

  await send(chatId, t(l, "thanks", { name: from.first_name ? ", " + esc(from.first_name) : "" }), { remove_keyboard: true });

  const c = await cfg();
  const v = priceVars(c, l);
  const menuRow = [btn(t(l, "b_menu"), "menu")];
  if (code === "tt") {
    const pay = [];
    if (c.whop.trucktalkMonthly) pay.push([urlBtn(t(l, "b_pay_m", v), c.whop.trucktalkMonthly)]);
    if (c.whop.trucktalk3m) pay.push([urlBtn(t(l, "b_pay_q", v), c.whop.trucktalk3m)]);
    if (pay.length) await send(chatId, t(l, "next_tt_pay"), { inline_keyboard: [...pay, menuRow] });
    else {
      const quiz = pageLink(c.sites.trucktalk, "check/", l);
      if (quiz) await send(chatId, t(l, "next_tt_test"), { inline_keyboard: [[appBtn(t(l, "b_test"), quiz)], menuRow] });
    }
  } else if (code === "disp") {
    await send(chatId, t(l, "next_disp"), { inline_keyboard: [menuRow] });
  } else if (code === "dsl") {
    const s = pageLink(c.sites.dslhelp, "", l);
    await send(chatId, t(l, "next_dsl"), { inline_keyboard: [...(s ? [[urlBtn(t(l, "b_site"), s)]] : []), menuRow] });
  } else if (code === "lc" || code === "ielts") {
    const demos = [];
    if (code === "lc" && c.demos.speakup1) demos.push([urlBtn(t(l, "b_demo_sp1"), c.demos.speakup1)]);
    if (c.demos.ielts) demos.push([urlBtn(t(l, "b_demo_ielts"), c.demos.ielts)]);
    await send(chatId, t(l, "next_lc"), { inline_keyboard: [...demos, menuRow] });
  }
  if (lead) await notifyAdmins(lead as Lead);
}

/** Text or contact typed while a sign-up question is open. */
async function onStateInput(u: BotUser, msg: TgMessage, l: Lang): Promise<void> {
  const chatId = msg.chat.id;
  const from = msg.from!;
  const text = (msg.text ?? "").trim();

  if (allLangs("b_cancel").includes(text)) {
    const hadKeyboard = u.state === "phone";
    await saveUser(u, { state: null, state_data: {} });
    await send(chatId, t(l, "cancelled"), hadKeyboard ? { remove_keyboard: true } : undefined);
    const m = menuScreen(l, "");
    await send(chatId, m.text, m.kb);
    return;
  }

  if (u.state === "phone") {
    if (msg.contact?.phone_number) return finishSignup(u, chatId, l, from, cleanPhone(msg.contact.phone_number) ?? msg.contact.phone_number);
    if (allLangs("b_skip").includes(text)) return finishSignup(u, chatId, l, from, null);
    const phone = text ? cleanPhone(text) : null;
    if (phone) return finishSignup(u, chatId, l, from, phone);
    await send(chatId, t(l, "bad_phone"));
    return;
  }

  if (u.state && TEXT_STEPS.has(u.state)) {
    const val = clipText(text, 300);
    if (!val) {
      await send(chatId, t(l, "need_text"));
      return;
    }
    const sd = u.state_data ?? {};
    sd.a = { ...(sd.a ?? {}), [u.state]: val };
    u.state_data = sd;
    return nextStep(u, chatId, l, from, null);
  }

  // A button question is open but they typed: show it again.
  if (u.state && CHOICES[u.state]) {
    await askStep(chatId, l, u.state, null);
    return;
  }
  await saveUser(u, { state: null, state_data: {} });
}

/* ---------------- customer messages to admins ---------------- */

async function forwardToAdmins(u: BotUser, msg: TgMessage, l: Lang) {
  const from = msg.from;
  const who = esc(fullName(from) || "Someone");
  const handle = from?.username ? ` @${esc(from.username)}` : "";
  const prod = u.product ? (PRODUCT_LABEL[u.product] ?? u.product) : "no product picked yet";
  const header = `💬 <b>${who}</b>${handle} · ${esc(prod)}\n<i>${l.toUpperCase()} · reply to this message to answer</i>`;

  // Keep a copy even if no admin is connected yet.
  await sb.from("sales_bot_inbox").insert({
    chat_id: msg.chat.id,
    product: u.product,
    text: clipText(msg.text ?? msg.caption ?? "", 2000),
    has_media: !msg.text,
  });

  for (const id of await adminIds()) {
    if (id === msg.chat.id) continue;
    if (msg.text) {
      const r = await tg("sendMessage", {
        chat_id: id,
        text: header + "\n\n" + esc(msg.text.slice(0, 3500)),
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });
      if (r.ok) await mapMsg(id, r.result.message_id, msg.chat.id);
    } else {
      const h = await tg("sendMessage", { chat_id: id, text: header, parse_mode: "HTML" });
      if (h.ok) await mapMsg(id, h.result.message_id, msg.chat.id);
      const c = await tg("copyMessage", { chat_id: id, from_chat_id: msg.chat.id, message_id: msg.message_id });
      if (c.ok) await mapMsg(id, c.result.message_id, msg.chat.id);
    }
  }

  const last = Number(u.state_data?.ack_at ?? 0);
  if (Date.now() - last > 10 * 60_000) {
    await saveUser(u, { state_data: { ...(u.state_data ?? {}), ack_at: Date.now() } });
    await send(msg.chat.id, t(l, "msg_received"));
  }
}

/* ---------------- admin tools ---------------- */

async function adminReply(msg: TgMessage): Promise<boolean> {
  const chatId = msg.chat.id;
  const replyTo = msg.reply_to_message;
  if (!replyTo) return false;
  const { data: map } = await sb
    .from("sales_bot_msgmap")
    .select("user_chat_id, lead_id")
    .eq("admin_chat_id", chatId)
    .eq("admin_message_id", replyTo.message_id)
    .maybeSingle();
  if (!map) return false;
  if (!map.user_chat_id) {
    await send(chatId, "This lead came from a website, so the bot can't message them. Use the Telegram or WhatsApp button on the card, or call them.");
    return true;
  }
  const r = await tg("copyMessage", { chat_id: map.user_chat_id, from_chat_id: chatId, message_id: msg.message_id });
  if (r.ok) {
    const re = await tg("setMessageReaction", { chat_id: chatId, message_id: msg.message_id, reaction: [{ type: "emoji", emoji: "👍" }] });
    if (!re.ok) await send(chatId, "✅ Sent");
    if (map.lead_id) {
      const { data: lead } = await sb.from("sales_leads").update({ status: "contacted" }).eq("id", map.lead_id).eq("status", "new").select("*").maybeSingle();
      if (lead) {
        await tg("editMessageText", {
          chat_id: chatId,
          message_id: replyTo.message_id,
          text: leadText(lead as Lead),
          parse_mode: "HTML",
          link_preview_options: { is_disabled: true },
          reply_markup: leadKeyboard(lead as Lead),
        });
      }
    }
  } else if (r.error_code === 403) {
    await sb.from("sales_bot_users").update({ blocked: true }).eq("chat_id", map.user_chat_id);
    await send(chatId, "❌ Not delivered: they blocked the bot.");
  } else {
    await send(chatId, `❌ Not delivered: ${esc(r.description ?? "unknown error")}`);
  }
  return true;
}

async function adminLeads(chatId: number) {
  const { data, error } = await sb
    .from("sales_leads")
    .select("id,product,name,phone,telegram,email,status,created_at")
    .order("id", { ascending: false })
    .limit(10);
  if (error) return send(chatId, "Couldn't load leads: " + esc(error.message));
  if (!data?.length) return send(chatId, "No leads yet. Share the sites and the bot link, and they'll show up here.");
  const lines = data.map((r) => {
    const contact = r.phone ?? (r.telegram ? "@" + r.telegram : r.email ?? "");
    const icon = (PRODUCT_LABEL[r.product] ?? "📌").split(" ")[0];
    return `/lead_${r.id} ${icon} ${esc(r.name ?? "—")} · ${esc(contact)} · ${esc(STATUS_LABEL[r.status] ?? r.status)} · ${ago(r.created_at)}`;
  });
  return send(chatId, "📋 <b>Last 10 leads</b>\n\n" + lines.join("\n") + "\n\nTap a /lead_ number to open its card.");
}

async function adminStats(chatId: number) {
  const { data, error } = await sb.rpc("sales_stats", { p_days: 7 });
  if (error || !data) return send(chatId, "Couldn't load stats: " + esc(error?.message ?? "no data"));
  const d = data as {
    leads_total: number;
    leads_by_product: Record<string, number>;
    leads_by_status: Record<string, number>;
    events: Record<string, number>;
    all_time_leads: number;
    paid_all_time: number;
    bot_users: number;
    bot_messages: number;
  };
  const byProd = Object.entries(d.leads_by_product).map(([p, n]) => `${PRODUCT_LABEL[p] ?? p} ${n}`).join(" · ") || "none";
  const byStatus = STATUSES.filter((s) => d.leads_by_status[s]).map((s) => `${STATUS_LABEL[s]} ${d.leads_by_status[s]}`).join(" · ") || "—";
  const ev = d.events ?? {};
  const count = (kind: string, product?: string) =>
    Object.entries(ev).filter(([k]) => k.startsWith(kind + ":") && (!product || k === `${kind}:${product}`)).reduce((a, [, n]) => a + n, 0);
  const views = ["trucktalk", "dispatch", "dslhelp", "centers"]
    .map((p) => `${(PRODUCT_LABEL[p] ?? p).split(" ")[0]} ${count("view", p)}`)
    .join(" · ");
  const text = [
    "📊 <b>Last 7 days</b>",
    "",
    `Leads: <b>${d.leads_total}</b>`,
    byProd,
    byStatus,
    "",
    `Page visits: ${views}`,
    `Quiz: ${count("quiz_start")} started · ${count("quiz_done")} finished`,
    `Forms started: ${count("form_start")} · Button taps: ${count("cta_click")}`,
    `Bot: ${count("bot_start")} starts · ${d.bot_messages ?? 0} messages`,
    "",
    `All time: ${d.all_time_leads} leads · ${d.paid_all_time} paid · ${d.bot_users} bot users`,
  ].join("\n");
  return send(chatId, text);
}

/* ---------------- update handlers ---------------- */

async function handleStart(u: BotUser, msg: TgMessage, payload: string) {
  const chatId = msg.chat.id;
  const from = msg.from!;
  const prevState = u.state;

  if (payload.startsWith("admin_")) {
    const s = await settings(true);
    if (s.setup_code && sameText(payload.slice(6), s.setup_code)) {
      await saveUser(u, { is_admin: true, state: null, state_data: {} });
      await tg("setMyCommands", { commands: ADMIN_COMMANDS, scope: { type: "chat", chat_id: chatId } });
      await send(
        chatId,
        "✅ <b>You're an admin of this bot.</b>\n\n" +
          "Every new sign-up from the four sites and from this bot arrives here as a card.\n" +
          "• Tap the buttons under a card to set its status.\n" +
          "• Reply to a card or a forwarded message to answer the person through the bot.\n\n" +
          "/leads — last 10 leads\n/stats — numbers for the last 7 days\n/menu — see the bot as a customer sees it",
      );
      return;
    }
    payload = "";
  }

  const [first, ...rest] = payload.split("_");
  const code = CODE_TO_PRODUCT[first] ? first : null;
  const srcRaw = code ? rest.join("_") : payload;
  const src = clip(srcRaw.replace(/[^A-Za-z0-9-]/g, ""), 40);
  const isNew = !u.source;

  const patch: Partial<BotUser> = { state: null, state_data: {} };
  if (!u.source) patch.source = src || "telegram";
  if (code) patch.product = CODE_TO_PRODUCT[code];
  if (!u.lang) patch.lang = guessLang(from.language_code, code ? CODE_TO_PRODUCT[code] : null);
  await saveUser(u, patch);
  const l = langOf(u, from);

  if (prevState === "phone") await send(chatId, "👌", { remove_keyboard: true });
  if (code) {
    const scr = productScreen(code, l, await cfg());
    await send(chatId, scr.text, scr.kb);
  } else {
    const m = menuScreen(l, from.first_name ?? "");
    await send(chatId, m.text, m.kb);
  }
  await sb.from("sales_events").insert({
    kind: "bot_start",
    product: code ? CODE_TO_PRODUCT[code] : null,
    source: src || "telegram",
    details: { first_time: isNew },
  });
}

async function onMessage(msg: TgMessage) {
  if (msg.chat.type !== "private" || !msg.from || msg.from.is_bot) return;
  const chatId = msg.chat.id;
  const u = await loadUser(msg.from);
  const l = langOf(u, msg.from);
  const text = (msg.text ?? "").trim();
  const cmd = text.startsWith("/") ? text.split(/\s+/)[0].replace(/@\w+$/, "").toLowerCase() : "";

  if (u.is_admin) {
    if (await adminReply(msg)) return;
    if (cmd === "/leads") return void (await adminLeads(chatId));
    if (cmd === "/stats") return void (await adminStats(chatId));
    const m = cmd.match(/^\/lead_?(\d+)$/) ?? (cmd === "/lead" ? text.match(/^\/lead\s+(\d+)/i) : null);
    if (m) {
      const { data: lead } = await sb.from("sales_leads").select("*").eq("id", Number(m[1])).maybeSingle();
      if (!lead) return void (await send(chatId, "No lead with that number."));
      await sendLeadCard(chatId, lead as Lead);
      return;
    }
  }

  if (cmd === "/start") return handleStart(u, msg, text.split(/\s+/)[1] ?? "");
  if (cmd === "/menu") {
    if (u.state) await saveUser(u, { state: null, state_data: {} });
    const m = menuScreen(l, msg.from.first_name ?? "");
    await send(chatId, m.text, m.kb);
    return;
  }
  if (cmd === "/lang") {
    const s = langScreen("");
    await send(chatId, s.text, s.kb);
    return;
  }

  if (u.state) return onStateInput(u, msg, l);

  // Stray reply-keyboard taps after a finished flow.
  if (allLangs("b_cancel").includes(text) || allLangs("b_skip").includes(text)) {
    await send(chatId, "👌", { remove_keyboard: true });
    const m = menuScreen(l, "");
    await send(chatId, m.text, m.kb);
    return;
  }

  if (u.is_admin) {
    await send(chatId, "To answer someone, reply to their card or message.\n/leads · /stats · /menu");
    return;
  }
  if (cmd) {
    const m = menuScreen(l, "");
    await send(chatId, m.text, m.kb);
    return;
  }
  await forwardToAdmins(u, msg, l);
}

async function onCallback(cq: TgCallback) {
  const data = cq.data ?? "";
  const chatId = cq.message?.chat.id ?? cq.from.id;
  let toast: string | undefined;
  try {
    if (cq.message && cq.message.chat.type !== "private") return;
    const u = await loadUser(cq.from);
    let l = langOf(u, cq.from);
    const c = await cfg();

    if (data.startsWith("st:")) {
      if (!u.is_admin) return;
      const [, idS, st] = data.split(":");
      if (!STATUSES.includes(st)) return;
      const { data: lead } = await sb.from("sales_leads").update({ status: st }).eq("id", Number(idS)).select("*").maybeSingle();
      if (!lead) {
        toast = "Lead not found";
        return;
      }
      await show(cq, chatId, leadText(lead as Lead), leadKeyboard(lead as Lead));
      toast = `#${idS} → ${STATUS_LABEL[st]}`;
      return;
    }

    if (data === "menu" || data === "cancel") {
      if (u.state) await saveUser(u, { state: null, state_data: {} });
      const m = menuScreen(l, data === "menu" ? (cq.from.first_name ?? "") : "");
      await show(cq, chatId, (data === "cancel" ? t(l, "cancelled") + "\n\n" : "") + m.text, m.kb);
      return;
    }

    if (data.startsWith("lang:")) {
      const [, back, pick] = data.split(":");
      if (!pick) {
        const s = langScreen(back ?? "");
        await show(cq, chatId, s.text, s.kb);
        return;
      }
      if (LANGS.includes(pick as Lang)) {
        await saveUser(u, { lang: pick as Lang });
        l = pick as Lang;
      }
      if (back && FLOWS[back]) {
        const scr = productScreen(back, l, c);
        await show(cq, chatId, scr.text, scr.kb);
      } else {
        const m = menuScreen(l, cq.from.first_name ?? "");
        await show(cq, chatId, m.text, m.kb);
      }
      return;
    }

    const [kind, code, value] = data.split(":");
    if (kind === "p" && FLOWS[code]) {
      if (u.state) await saveUser(u, { state: null, state_data: {} });
      if (u.product !== CODE_TO_PRODUCT[code]) await saveUser(u, { product: CODE_TO_PRODUCT[code] });
      const scr = productScreen(code, l, c);
      await show(cq, chatId, scr.text, scr.kb);
      return;
    }
    if (kind === "pr" && FLOWS[code]) {
      const scr = pricesScreen(code, l, c);
      await show(cq, chatId, scr.text, scr.kb);
      return;
    }
    if (kind === "su" && FLOWS[code]) {
      await startSignup(u, chatId, code, l, cq);
      return;
    }
    if (kind === "ask" && FLOWS[code]) {
      await saveUser(u, { state: null, state_data: {}, product: CODE_TO_PRODUCT[code] });
      await show(cq, chatId, t(l, "ask_prompt"), { inline_keyboard: [[btn(t(l, "b_back"), "p:" + code)]] });
      return;
    }
    if (kind === "a") {
      // code = the step this button belongs to; ignore taps on old questions.
      if (u.state !== code || !(CHOICES[code] ?? []).some((o) => o.v === value)) return;
      const sd = u.state_data ?? {};
      sd.a = { ...(sd.a ?? {}), [code]: value };
      u.state_data = sd;
      await nextStep(u, chatId, l, cq.from, cq);
      return;
    }
  } catch (e) {
    console.error("callback failed:", scrub(e));
  } finally {
    await tg("answerCallbackQuery", { callback_query_id: cq.id, ...(toast ? { text: toast } : {}) });
  }
}

/* ---------------- setup page endpoints ---------------- */

const tries = new Map<string, { n: number; t: number }>();
function tooManyTries(req: Request): boolean {
  const ip = (req.headers.get("cf-connecting-ip") || (req.headers.get("x-forwarded-for") ?? "").split(",")[0] || "?").trim();
  const now = Date.now();
  const h = tries.get(ip);
  if (!h || now - h.t > 10 * 60_000) {
    tries.set(ip, { n: 1, t: now });
    return false;
  }
  h.n++;
  return h.n > 30;
}

async function checkCode(req: Request, body: Record<string, unknown>): Promise<Response | null> {
  if (tooManyTries(req)) return json({ ok: false, error: "too_many_tries" }, 429);
  const s = await settings(true);
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!s.setup_code || !code || !sameText(code, s.setup_code)) return json({ ok: false, error: "bad_code" }, 403);
  return null;
}

const webhookUrl = () => `${SUPABASE_URL}/functions/v1/sales-bot`;

async function brandBot(token: string) {
  for (const l of ["en", "uz", "ru"] as Lang[]) {
    const lc = l === "en" ? {} : { language_code: l };
    await tg("setMyCommands", {
      commands: [
        { command: "start", description: t(l, "cmd_start") },
        { command: "menu", description: t(l, "cmd_menu") },
        { command: "lang", description: t(l, "cmd_lang") },
      ],
      ...lc,
    }, token);
    await tg("setMyDescription", { description: t(l, "desc"), ...lc }, token);
    await tg("setMyShortDescription", { short_description: t(l, "short_desc"), ...lc }, token);
  }
}

async function handleSetup(req: Request): Promise<Response> {
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const body = await readBody(req);
  const bad = await checkCode(req, body);
  if (bad) return bad;
  const token = String(body.token ?? "").trim();
  if (!/^\d{6,12}:[A-Za-z0-9_-]{30,60}$/.test(token)) return json({ ok: false, error: "bad_token" }, 400);
  const me = await tg("getMe", {}, token);
  if (!me.ok || !me.result?.username) return json({ ok: false, error: "token_rejected" }, 400);

  const secret = randomHex(24);
  await saveSettings({
    tg_token: token,
    webhook_secret: secret,
    bot_username: String(me.result.username),
    bot_name: String(me.result.first_name ?? ""),
    bot_id: String(me.result.id),
    bot_setup_at: new Date().toISOString(),
  });
  const hook = await tg("setWebhook", {
    url: webhookUrl(),
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
    max_connections: 20,
  }, token);
  if (!hook.ok) return json({ ok: false, error: "webhook_failed", detail: hook.description ?? "" }, 502);
  await brandBot(token);

  const s = await settings(true);
  return json({
    ok: true,
    bot_username: me.result.username,
    bot_name: me.result.first_name ?? "",
    admin_link: `https://t.me/${me.result.username}?start=admin_${s.setup_code}`,
  });
}

async function handleStatus(req: Request): Promise<Response> {
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const body = await readBody(req);
  const bad = await checkCode(req, body);
  if (bad) return bad;
  const s = await settings(true);
  const { count: admins } = await sb.from("sales_bot_users").select("chat_id", { count: "exact", head: true }).eq("is_admin", true);
  const { count: leads } = await sb.from("sales_leads").select("id", { count: "exact", head: true });
  // deno-lint-ignore no-explicit-any
  let webhook: any = null;
  if (s.tg_token) {
    const w = await tg("getWebhookInfo");
    if (w.ok) {
      webhook = {
        connected: w.result.url === webhookUrl(),
        pending: w.result.pending_update_count ?? 0,
        last_error: w.result.last_error_message ?? null,
        last_error_at: w.result.last_error_date ? new Date(w.result.last_error_date * 1000).toISOString() : null,
      };
    } else webhook = { connected: false, last_error: w.description ?? "token no longer works" };
  }
  return json({
    ok: true,
    configured: !!s.tg_token,
    bot_username: s.bot_username || null,
    bot_name: s.bot_name || null,
    admin_link: s.bot_username ? `https://t.me/${s.bot_username}?start=admin_${s.setup_code}` : null,
    admins: admins ?? 0,
    leads: leads ?? 0,
    webhook,
  });
}

/* ---------------- entry ---------------- */

async function handleWebhook(req: Request): Promise<Response> {
  if (req.method !== "POST") return json({ ok: true, service: "sales-bot" });
  const got = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  let s = await settings();
  if (!s.webhook_secret || !sameText(got, s.webhook_secret)) {
    s = await settings(true);
    if (!s.webhook_secret || !sameText(got, s.webhook_secret)) return new Response("forbidden", { status: 401 });
  }
  // deno-lint-ignore no-explicit-any
  const update: any = await req.json().catch(() => null);
  try {
    if (update?.message) await onMessage(update.message as TgMessage);
    else if (update?.callback_query) await onCallback(update.callback_query as TgCallback);
  } catch (e) {
    console.error("update failed:", scrub(e));
  }
  return new Response("ok");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const last = new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";
  try {
    if (last === "setup") return await handleSetup(req);
    if (last === "status") return await handleStatus(req);
    return await handleWebhook(req);
  } catch (e) {
    console.error("sales-bot:", scrub(e));
    if (last === "setup" || last === "status") return json({ ok: false, error: "server" }, 500);
    return new Response("ok");
  }
});

