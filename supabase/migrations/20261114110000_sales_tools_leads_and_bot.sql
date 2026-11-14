-- Sales tools (money pages + Telegram sales bot). Separate from UniSprint tables: every table starts with sales_.
-- Only the service role (edge functions) can read or write them: RLS on, no policies, grants revoked.

create table if not exists public.sales_leads (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  product text not null,
  name text,
  phone text,
  telegram text,
  email text,
  company text,
  lang text,
  source text,
  page text,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'new',
  notes text,
  tg_chat_id bigint,
  ip_hash text,
  constraint sales_leads_product_chk check (product in ('trucktalk','dispatch','dslhelp','centers','ielts','other')),
  constraint sales_leads_status_chk check (status in ('new','contacted','trial','paid','lost'))
);
create index if not exists sales_leads_created_idx on public.sales_leads (created_at desc);
create index if not exists sales_leads_product_status_idx on public.sales_leads (product, status);
create index if not exists sales_leads_ip_idx on public.sales_leads (ip_hash, created_at desc);

create table if not exists public.sales_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null,
  product text,
  source text,
  value numeric,
  details jsonb not null default '{}'::jsonb
);
create index if not exists sales_events_created_idx on public.sales_events (created_at desc);
create index if not exists sales_events_kind_idx on public.sales_events (kind, product, created_at desc);

create table if not exists public.sales_bot_users (
  chat_id bigint primary key,
  username text,
  first_name text,
  lang text,
  product text,
  state text,
  state_data jsonb not null default '{}'::jsonb,
  is_admin boolean not null default false,
  source text,
  blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_bot_msgmap (
  admin_chat_id bigint not null,
  admin_message_id bigint not null,
  user_chat_id bigint,
  lead_id bigint references public.sales_leads(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (admin_chat_id, admin_message_id)
);
create index if not exists sales_bot_msgmap_lead_idx on public.sales_bot_msgmap (lead_id);

create table if not exists public.sales_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.sales_leads enable row level security;
alter table public.sales_events enable row level security;
alter table public.sales_bot_users enable row level security;
alter table public.sales_bot_msgmap enable row level security;
alter table public.sales_settings enable row level security;

revoke all on table public.sales_leads, public.sales_events, public.sales_bot_users, public.sales_bot_msgmap, public.sales_settings from anon, authenticated;
revoke all on sequence public.sales_leads_id_seq, public.sales_events_id_seq from anon, authenticated;

create or replace function public.sales_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.sales_touch_updated_at() from public, anon, authenticated;

create trigger sales_leads_touch before update on public.sales_leads
  for each row execute function public.sales_touch_updated_at();

create trigger sales_bot_users_touch before update on public.sales_bot_users
  for each row execute function public.sales_touch_updated_at();

comment on table public.sales_leads is 'Leads from the money pages (Truck Talk, dispatch, DSL HELP, learning centers) and the Telegram sales bot. Status: new, contacted, trial, paid, lost.';
comment on table public.sales_events is 'Anonymous funnel events from the money pages: view, quiz_start, quiz_done, form_start, cta_click. No personal data.';
comment on table public.sales_bot_users is 'People who opened the Telegram sales bot; is_admin marks who receives lead alerts.';
comment on table public.sales_settings is 'Sales bot settings (bot token, webhook secret, setup code). Service role only.';