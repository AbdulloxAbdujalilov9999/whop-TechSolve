// ── Edit this file to customise the site ─────────────────────────────
window.SITE = {
  brand: "Dispatching",

  // Your public Whop store page (NOT the /dashboard/ link — that one is private).
  // Find it on Whop: your business → "View store". It looks like https://whop.com/your-store/
  whopUrl: "https://whop.com/",

  // Where "Message me" / "Start a project" goes. Telegram link, email (mailto:...), or Discord invite.
  contactUrl: "https://t.me/your_username",

  // Product cards. cat: "bots" | "apps" | "platforms" | "automation"
  // Give a product its own Whop link with `url`; otherwise it falls back to whopUrl.
  // Prices are placeholders — set them to match your Whop listings.
  products: [
    { cat: "bots", title: "Shop & Delivery Bot", desc: "Catalog, cart, card payments and instant delivery of digital goods inside Telegram.", price: "from $29", tags: ["Telegram", "Payments", "Admin panel"], badge: "Popular" },
    { cat: "bots", title: "Paid Channel Access Bot", desc: "Sell subscriptions to private channels and groups. Auto-invite on payment, auto-remove on expiry.", price: "from $39", tags: ["Telegram", "Subscriptions"] },
    { cat: "bots", title: "AI Assistant Bot", desc: "A ChatGPT-style bot with your own prompt, memory, and usage limits per user.", price: "from $35", tags: ["Telegram", "AI"], badge: "New" },
    { cat: "bots", title: "Support & Ticket Bot", desc: "Route customer messages to your team, track tickets, send canned replies.", price: "from $25", tags: ["Telegram", "Support"] },
    { cat: "bots", title: "Group Moderator Bot", desc: "Anti-spam, captcha for new members, warnings, bans, welcome messages and rules.", price: "from $19", tags: ["Telegram", "Moderation"] },
    { cat: "bots", title: "Giveaway & Referral Bot", desc: "Run contests, count invites, pick winners fairly and grow your channel.", price: "from $19", tags: ["Telegram", "Growth"] },

    { cat: "apps", title: "Landing Page Kit", desc: "Fast, modern, mobile-first landing pages with contact forms and analytics-ready markup.", price: "from $15", tags: ["HTML/CSS", "Responsive"] },
    { cat: "apps", title: "Booking & Appointments App", desc: "Let clients pick a slot, get reminders and pay a deposit. Perfect for local services.", price: "from $49", tags: ["Web app", "Payments"] },
    { cat: "apps", title: "Admin Dashboard Template", desc: "Clean dashboard with charts, tables, auth and dark mode — plug in your own data.", price: "from $29", tags: ["Dashboard", "Auth"] },
    { cat: "apps", title: "Link-in-Bio Page", desc: "A sharp personal page with links, products and social proof. Deploys free on Vercel.", price: "from $9", tags: ["Static", "Free hosting"] },

    { cat: "platforms", title: "Membership Platform", desc: "Gated content, subscriptions, member area and an admin panel — launch your own community.", price: "from $99", tags: ["SaaS", "Subscriptions"], badge: "Best value" },
    { cat: "platforms", title: "Mini Marketplace", desc: "Vendors, listings, orders and payouts. A starting point for your own marketplace.", price: "from $129", tags: ["Marketplace", "Multi-vendor"] },
    { cat: "platforms", title: "Course Platform", desc: "Host video lessons, track progress and issue certificates. Sell your knowledge.", price: "from $89", tags: ["Education", "Video"] },

    { cat: "automation", title: "Web Scraper & Monitor", desc: "Track prices, listings or news and get pinged on Telegram when something changes.", price: "from $29", tags: ["Python", "Alerts"] },
    { cat: "automation", title: "Auto-Poster", desc: "Schedule and cross-post content to channels and socials from a single queue.", price: "from $25", tags: ["Scheduling", "Telegram"] },
    { cat: "automation", title: "Report Generator", desc: "Turn spreadsheets or APIs into clean PDF/Excel reports delivered on a schedule.", price: "from $25", tags: ["Reports", "Cron"] }
  ]
};
