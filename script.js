(function () {
  const S = window.SITE;

  const ICONS = {
    bot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 14h.01M15 14h.01M2 13v3M22 13v3"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5M3 17.5l9 5 9-5" opacity=".6"/></svg>',
    zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>'
  };
  const CATS = [
    { id: "all", label: "All" },
    { id: "bots", label: "Telegram bots", icon: "bot" },
    { id: "apps", label: "Web apps", icon: "globe" },
    { id: "platforms", label: "Platforms", icon: "layers" },
    { id: "automation", label: "Automation", icon: "zap" }
  ];
  const iconFor = (cat) => (CATS.find((c) => c.id === cat) || {}).icon || "zap";
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Brand + links
  document.querySelectorAll("[data-brand]").forEach((el) => (el.textContent = S.brand));
  document.title = S.brand + " — Telegram bots, web apps & platforms, ready to launch";
  document.querySelectorAll("[data-whop]").forEach((el) => (el.href = S.whopUrl));
  document.querySelectorAll("[data-contact]").forEach((el) => {
    el.href = S.contactUrl;
    if (S.contactUrl.startsWith("mailto:")) { el.removeAttribute("target"); }
  });
  document.getElementById("year").textContent = new Date().getFullYear();
  document.querySelectorAll("[data-icon]").forEach((el) => (el.innerHTML = ICONS[el.dataset.icon]));

  // Filters + products
  const filters = document.getElementById("filters");
  const grid = document.getElementById("grid");
  let active = "all";

  filters.innerHTML = CATS.map((c) => `<button class="chip${c.id === active ? " active" : ""}" role="tab" data-cat="${c.id}">${c.label}</button>`).join("");

  function render() {
    const list = S.products.filter((p) => active === "all" || p.cat === active);
    grid.innerHTML = list.map((p) => `
      <a class="product" href="${esc(p.url || S.whopUrl)}" target="_blank" rel="noopener">
        <div class="p-top"><div class="ico">${ICONS[iconFor(p.cat)]}</div>${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ""}</div>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.desc)}</p>
        <div class="tags">${(p.tags || []).map((t) => `<span>${esc(t)}</span>`).join("")}</div>
        <div class="p-foot"><span class="price">${esc(p.price)}</span><span class="buy">Get it on Whop <span>→</span></span></div>
      </a>`).join("");
  }
  render();

  filters.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    active = b.dataset.cat;
    filters.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === b));
    render();
  });

  // Card spotlight follows cursor
  grid.addEventListener("pointermove", (e) => {
    const card = e.target.closest(".product");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", e.clientX - r.left + "px");
  });

  // Nav
  const nav = document.getElementById("nav");
  const links = document.getElementById("navLinks");
  const burger = document.getElementById("burger");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 10);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  burger.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    burger.setAttribute("aria-expanded", open);
  });
  links.addEventListener("click", (e) => {
    if (e.target.tagName === "A") { links.classList.remove("open"); burger.setAttribute("aria-expanded", false); }
  });

  // Scroll reveal
  const els = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    els.forEach((el, i) => { el.style.transitionDelay = (i % 4) * 70 + "ms"; io.observe(el); });
  } else {
    els.forEach((el) => el.classList.add("in"));
  }
})();
