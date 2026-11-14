/* Money pages — shared helpers: languages, traffic source, page events, lead forms.
 * Plain ES2015 so it runs in old phone browsers and inside Telegram.
 */
(function () {
  "use strict";
  var CFG = window.MONEY_CFG || {};
  var M = (window.M = {});
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} },
    sget: function (k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } },
    sset: function (k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }
  };
  M.store = store;

  function qs(name) {
    var m = new RegExp("[?&]" + name + "=([^&#]*)").exec(window.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : "";
  }
  M.qs = qs;

  /* ---------- Telegram Mini App (when the page is opened from the bot) ---------- */
  M.tgUser = null;
  try {
    var wa = window.Telegram && window.Telegram.WebApp;
    if (wa && wa.initData) {
      wa.ready();
      wa.expand();
      M.tgUser = (wa.initDataUnsafe && wa.initDataUnsafe.user) || null;
      document.documentElement.classList.add("in-telegram");
    }
  } catch (e) {}

  /* ---------- Traffic source: ?src=yt | tg | ig | bot ... kept for the visit ---------- */
  M.source = function () {
    var s = qs("src") || qs("utm_source") || qs("ref");
    if (s) { store.sset("m_src", s.slice(0, 40)); return s.slice(0, 40); }
    var saved = store.sget("m_src");
    if (saved) return saved;
    if (M.tgUser) return "bot";
    var r = document.referrer || "";
    if (/t\.me|telegram/i.test(r)) return "tg";
    if (/youtube|youtu\.be/i.test(r)) return "yt";
    if (/instagram/i.test(r)) return "ig";
    if (/tiktok/i.test(r)) return "tt";
    if (/facebook|fb\./i.test(r)) return "fb";
    if (/google\./i.test(r)) return "google";
    return r ? "web" : "direct";
  };

  /* ---------- Languages ---------- */
  var DICT = {}, LANGS = ["uz", "ru", "en"], DEFAULT_LANG = "uz", current = "uz";
  M.lang = function () { return current; };
  M.t = function (key) {
    var d = DICT[current] || {};
    if (d[key] !== undefined) return d[key];
    var f = DICT[DEFAULT_LANG] || {};
    return f[key] !== undefined ? f[key] : key;
  };
  M.setLang = function (lang) {
    if (LANGS.indexOf(lang) < 0) lang = DEFAULT_LANG;
    current = lang;
    store.set("m_lang", lang);
    document.documentElement.lang = lang;
    var nodes = document.querySelectorAll("[data-t]");
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = M.t(nodes[i].getAttribute("data-t"));
    nodes = document.querySelectorAll("[data-th]");
    for (i = 0; i < nodes.length; i++) nodes[i].innerHTML = M.t(nodes[i].getAttribute("data-th"));
    nodes = document.querySelectorAll("[data-tp]");
    for (i = 0; i < nodes.length; i++) nodes[i].setAttribute("placeholder", M.t(nodes[i].getAttribute("data-tp")));
    nodes = document.querySelectorAll("[data-ta]");
    for (i = 0; i < nodes.length; i++) nodes[i].setAttribute("aria-label", M.t(nodes[i].getAttribute("data-ta")));
    nodes = document.querySelectorAll(".lang-switch button");
    for (i = 0; i < nodes.length; i++) nodes[i].setAttribute("aria-pressed", nodes[i].getAttribute("data-lang") === lang ? "true" : "false");
    var title = M.t("meta_title");
    if (title && title !== "meta_title") document.title = title;
    var desc = document.querySelector('meta[name="description"]');
    var dd = M.t("meta_desc");
    if (desc && dd && dd !== "meta_desc") desc.setAttribute("content", dd);
    if (typeof M.onLang === "function") M.onLang(lang);
  };
  M.initLang = function (dict, opts) {
    DICT = dict || {};
    opts = opts || {};
    LANGS = opts.langs || LANGS;
    DEFAULT_LANG = opts.fallback || LANGS[0];
    var pick = qs("lang") || store.get("m_lang");
    if (!pick || LANGS.indexOf(pick) < 0) {
      var nav = ((navigator.languages && navigator.languages[0]) || navigator.language || "").toLowerCase();
      if (M.tgUser && M.tgUser.language_code) nav = String(M.tgUser.language_code).toLowerCase();
      if (nav.indexOf("uz") === 0 && LANGS.indexOf("uz") >= 0) pick = "uz";
      else if ((nav.indexOf("ru") === 0 || nav.indexOf("kk") === 0 || nav.indexOf("ky") === 0 || nav.indexOf("tg") === 0) && LANGS.indexOf("ru") >= 0) pick = "ru";
      else if (nav.indexOf("en") === 0 && LANGS.indexOf("en") >= 0 && opts.englishForEnglishBrowsers) pick = "en";
      else pick = opts.defaultLang || DEFAULT_LANG;
    }
    var btns = document.querySelectorAll(".lang-switch button");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () { M.setLang(this.getAttribute("data-lang")); });
    }
    M.setLang(pick);
  };

  /* ---------- Sending to the backend (text/plain avoids a CORS preflight) ---------- */
  function post(payload) {
    if (!CFG.leadUrl) return Promise.reject(new Error("no_endpoint"));
    return fetch(CFG.leadUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(payload),
      keepalive: true
    }).then(function (r) {
      return r.json().catch(function () { return { ok: false }; }).then(function (j) {
        if (!r.ok || !j.ok) { var e = new Error(j.error || "http_" + r.status); e.code = j.error; throw e; }
        return j;
      });
    });
  }

  M.event = function (kind, product, value, details) {
    try {
      var body = JSON.stringify({ type: "event", kind: kind, product: product, source: M.source(), value: typeof value === "number" ? value : null, details: details || {} });
      if (navigator.sendBeacon && CFG.leadUrl) {
        navigator.sendBeacon(CFG.leadUrl, new Blob([body], { type: "text/plain;charset=UTF-8" }));
      } else {
        post(JSON.parse(body)).catch(function () {});
      }
    } catch (e) {}
  };

  M.trackView = function (product) {
    var key = "m_view_" + product;
    if (store.sget(key)) return;
    store.sset(key, "1");
    M.event("view", product, null, { path: location.pathname, lang: current });
  };

  M.submitLead = function (product, data) {
    var payload = {
      type: "lead",
      product: product,
      lang: current,
      source: M.source(),
      page: (location.origin + location.pathname).slice(0, 300),
      hp: data.hp || ""
    };
    ["name", "phone", "telegram", "email", "company"].forEach(function (k) { if (data[k]) payload[k] = data[k]; });
    payload.details = data.details || {};
    return post(payload);
  };

  /* ---------- Forms: <form data-lead="trucktalk"> ---------- */
  M.formData = function (form) {
    var out = { details: {} }, els = form.elements;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!el.name || el.disabled) continue;
      if ((el.type === "checkbox" || el.type === "radio") && !el.checked) continue;
      var v = (el.value || "").trim();
      if (!v) continue;
      if (["name", "phone", "telegram", "email", "company", "hp"].indexOf(el.name) >= 0) out[el.name] = v;
      else if (out.details[el.name]) out.details[el.name] += ", " + v;
      else out.details[el.name] = v;
    }
    if (out.telegram) out.telegram = out.telegram.replace(/^https?:\/\/t\.me\//i, "").replace(/^@/, "");
    return out;
  };

  M.bindLeadForm = function (form, opts) {
    opts = opts || {};
    var product = form.getAttribute("data-lead");
    var started = false;
    if (M.tgUser) {
      if (form.elements.telegram && M.tgUser.username && !form.elements.telegram.value) form.elements.telegram.value = M.tgUser.username;
      if (form.elements.name && !form.elements.name.value) form.elements.name.value = [M.tgUser.first_name, M.tgUser.last_name].filter(Boolean).join(" ");
    }
    form.addEventListener("focusin", function () {
      if (!started) { started = true; M.event("form_start", product); }
    });
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var btn = form.querySelector("[type=submit]");
      var msg = form.querySelector(".form-msg");
      var data = M.formData(form);
      if (opts.extra) { var x = opts.extra(); for (var k in x) if (Object.prototype.hasOwnProperty.call(x, k)) data.details[k] = x[k]; }
      if (!data.phone && !data.telegram && !data.email) {
        if (msg) { msg.className = "form-msg err"; msg.textContent = M.t("form_need_contact"); }
        var first = form.elements.phone || form.elements.telegram || form.elements.email;
        if (first) first.focus();
        return;
      }
      if (btn) { btn.disabled = true; btn.setAttribute("data-label", btn.textContent); btn.textContent = M.t("form_sending"); }
      if (msg) { msg.className = "form-msg"; msg.textContent = ""; }
      M.submitLead(product, data).then(function (res) {
        form.classList.add("is-sent");
        var done = form.parentNode.querySelector(".form-done") || document.querySelector(opts.done || ".form-done");
        if (done) { done.hidden = false; done.scrollIntoView({ behavior: "smooth", block: "center" }); }
        form.hidden = true;
        if (typeof opts.onSent === "function") opts.onSent(res, data);
      }).catch(function (err) {
        if (btn) { btn.disabled = false; btn.textContent = btn.getAttribute("data-label") || "OK"; }
        if (!msg) return;
        msg.className = "form-msg err";
        msg.textContent = err && err.code === "rate_limited" ? M.t("form_rate") : M.t("form_error");
        var fb = M.contactLink(M.leadText(product, data));
        if (fb) {
          var a = document.createElement("a");
          a.href = fb; a.target = "_blank"; a.rel = "noopener"; a.className = "btn btn-small";
          a.textContent = M.t("form_error_tg");
          msg.appendChild(document.createElement("br"));
          msg.appendChild(a);
        }
      });
    });
  };

  M.leadText = function (product, data) {
    var parts = ["[" + product + "]"];
    ["name", "phone", "telegram", "email", "company"].forEach(function (k) { if (data[k]) parts.push(k + ": " + data[k]); });
    for (var k in data.details) if (Object.prototype.hasOwnProperty.call(data.details, k)) parts.push(k + ": " + data.details[k]);
    return parts.join("\n");
  };

  /* ---------- Links ---------- */
  M.botLink = function (payload) {
    if (!CFG.botUsername) return "";
    return "https://t.me/" + CFG.botUsername + (payload ? "?start=" + encodeURIComponent(payload) : "");
  };
  M.contactLink = function (text) {
    if (CFG.botUsername) return M.botLink("");
    if (!CFG.contactTelegram) return "";
    return "https://t.me/" + CFG.contactTelegram + (text ? "?text=" + encodeURIComponent(text.slice(0, 900)) : "");
  };

  /* Show/hide elements that need a setting: data-need="botUsername" | "whop.trucktalkMonthly" */
  M.applyConfig = function () {
    var nodes = document.querySelectorAll("[data-need]");
    for (var i = 0; i < nodes.length; i++) {
      var path = nodes[i].getAttribute("data-need").split("."), v = CFG;
      for (var j = 0; j < path.length && v; j++) v = v[path[j]];
      nodes[i].hidden = !v;
      if (v && nodes[i].tagName === "A" && nodes[i].hasAttribute("data-href")) {
        var tpl = nodes[i].getAttribute("data-href");
        nodes[i].href = tpl === "$" ? v : tpl.replace("$", v);
      }
    }
    nodes = document.querySelectorAll("[data-bot]");
    for (i = 0; i < nodes.length; i++) {
      var link = M.botLink(nodes[i].getAttribute("data-bot") + "_" + M.source().replace(/[^A-Za-z0-9]/g, "").slice(0, 12));
      if (link) { nodes[i].href = link; nodes[i].hidden = false; } else nodes[i].hidden = true;
    }
    nodes = document.querySelectorAll("[data-contact]");
    for (i = 0; i < nodes.length; i++) {
      var c = M.contactLink("");
      if (c) { nodes[i].href = c; nodes[i].hidden = false; } else nodes[i].hidden = true;
    }
    nodes = document.querySelectorAll("[data-demo]");
    for (i = 0; i < nodes.length; i++) {
      var d = (CFG.demos || {})[nodes[i].getAttribute("data-demo")];
      if (d) nodes[i].href = d; else nodes[i].hidden = true;
    }
    nodes = document.querySelectorAll("[data-site]");
    for (i = 0; i < nodes.length; i++) {
      var s = (CFG.sites || {})[nodes[i].getAttribute("data-site")];
      if (s) nodes[i].href = s + (nodes[i].getAttribute("data-path") || ""); else nodes[i].hidden = true;
    }
  };

  /* ---------- Live settings: the bot username and pay links saved on the setup page ---------- */
  M.loadRemoteConfig = function () {
    var w = CFG.whop || {};
    if (!CFG.leadUrl || !window.fetch) return;
    if (CFG.botUsername && w.trucktalkMonthly && w.trucktalk3m && w.dispatchKit) return;
    fetch(CFG.leadUrl, { method: "GET" }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) return;
      var changed = false;
      if (j.bot && !CFG.botUsername) { CFG.botUsername = j.bot; changed = true; }
      if (j.whop) {
        CFG.whop = CFG.whop || {};
        for (var k in j.whop) {
          if (Object.prototype.hasOwnProperty.call(j.whop, k) && j.whop[k] && !CFG.whop[k]) { CFG.whop[k] = j.whop[k]; changed = true; }
        }
      }
      if (changed) { M.applyConfig(); if (typeof M.onConfig === "function") M.onConfig(CFG); }
    }).catch(function () {});
  };

  /* ---------- Numbers ---------- */
  M.money = function (n, cur) {
    var s = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, cur === "uzs" ? " " : ",");
    if (cur === "uzs") return s + " " + (current === "ru" ? "сум" : current === "en" ? "UZS" : "so'm");
    return "$" + s;
  };

  /* ---------- Small UI bits ---------- */
  M.onReady = function (fn) {
    if (document.readyState !== "loading") fn(); else document.addEventListener("DOMContentLoaded", fn);
  };
  M.onReady(function () {
    M.applyConfig();
    M.loadRemoteConfig();
    var y = document.querySelectorAll("[data-year]");
    for (var i = 0; i < y.length; i++) y[i].textContent = new Date().getFullYear();
    var forms = document.querySelectorAll("form[data-lead]");
    for (i = 0; i < forms.length; i++) if (!forms[i].hasAttribute("data-manual")) M.bindLeadForm(forms[i]);
    var clicks = document.querySelectorAll("[data-cta]");
    for (i = 0; i < clicks.length; i++) {
      clicks[i].addEventListener("click", function () { M.event("cta_click", this.getAttribute("data-product") || null, null, { cta: this.getAttribute("data-cta") }); });
    }
  });
})();
