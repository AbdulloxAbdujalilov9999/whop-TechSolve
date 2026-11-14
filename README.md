# Money sites

Four sales sites, one lead inbox and a Telegram sales bot. This branch (`money-sites`) is separate from the
Whop storefront on `main`.

| Site | Folder | Sells | Default language |
| --- | --- | --- | --- |
| Truck Talk | `trucktalk/` (+ `check/` quiz, `setup/` bot panel) | Live English classes for truck drivers | Uzbek |
| Haulwise Dispatch | `dispatch/` | Dispatch for owner-operators, a % of each load | English |
| DSL HELP | `dslhelp/` | Telegram help desk bot for trucking offices | English |
| SpeakUp for centers | `centers/` | SpeakUp-1 course + IELTS CD Prep for learning centers | Uzbek |

Every page switches between Uzbek, Russian and English, works on old phones and inside Telegram, and is
`noindex` until you remove that tag.

## How it fits together

```
sales page form ──POST──▶ sales-lead (Supabase Edge Function) ──▶ sales_leads table
                                   │                                    │
page events (views, clicks) ──────▶ sales_events                        └─▶ Telegram card to every admin
Telegram bot chats ──────▶ sales-bot (Edge Function, webhook) ──▶ same tables + admin cards
```

* Supabase project: **qabul-admissions**. Tables `sales_leads`, `sales_events`, `sales_bot_users`,
  `sales_bot_msgmap`, `sales_bot_inbox`, `sales_settings`. RLS is on and only the Edge Functions
  (service role) can read or write them.
* Admins get each lead as a Telegram card with status buttons (Contacted, Trial, Paid, Lost) and
  Telegram/WhatsApp buttons. Reply to a card from a bot user to answer them through the bot.
* Admin commands in the bot: `/leads`, `/stats`, `/lead_<id>`.

## Settings

* `shared/config.js`: endpoint, backup Telegram contact, site URLs, demo links and **all prices**.
  Change a price here and push; every site picks it up on the next deploy.
* The bot keeps its own copy of the prices in `supabase/functions/sales-bot/texts.ts` (`DEFAULT_CFG`).
  Keep the two in sync.
* The bot username and the Whop pay links are saved from the setup page (`/setup/` on the Truck Talk site)
  into the `sales_settings` table. Pages load them at runtime, so no redeploy is needed.

## First-time setup (only you can do these)

1. Create the bot in [@BotFather](https://t.me/BotFather) (`/newbot`), copy the token.
2. Open `https://trucktalk-classes.onrender.com/setup/#code=<setup code>` (the code is in the project
   thread, never in this repo), paste the token and press **Connect**. Then open the admin link it shows
   and press Start: that makes you an admin.
3. Create the Whop products, paste their checkout links on the same setup page and save.

## Build and deploy

```bash
bash build.sh            # all sites into dist/<site>/
bash build.sh dslhelp    # one site
```

Each Render static site uses branch `money-sites`, build command `bash build.sh <site>` and publish
directory `dist/<site>`. `dist/` is not committed.

Edge Functions (Supabase CLI):

```bash
bash supabase/sync-shared.sh            # copy _shared/sales.ts into each function
supabase functions deploy sales-lead --no-verify-jwt
supabase functions deploy sales-bot --no-verify-jwt
```

Migrations are in `supabase/migrations/` and are already applied.

## Before you go public

* Remove `<meta name="robots" content="noindex">` from the pages you want in Google.
* Check every price and promise on the pages (pilot lengths, response times, what the bots do).
* The free Supabase plan pauses after a week without traffic. The pages ping `sales-lead` on every visit,
  and an uptime monitor on `https://ewuxolpgwwfbikuxutbw.supabase.co/functions/v1/sales-lead` keeps it awake.
