-- Messages people send to the sales bot (kept even before an admin connects),
-- and the numbers behind the bot's /stats command. Server-side only.

create table if not exists public.sales_bot_inbox (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  chat_id bigint not null,
  product text,
  text text,
  has_media boolean not null default false
);
create index if not exists sales_bot_inbox_created_idx on public.sales_bot_inbox (created_at desc);
create index if not exists sales_bot_inbox_chat_idx on public.sales_bot_inbox (chat_id, created_at desc);

alter table public.sales_bot_inbox enable row level security;
revoke all on table public.sales_bot_inbox from anon, authenticated;
revoke all on sequence public.sales_bot_inbox_id_seq from anon, authenticated;
comment on table public.sales_bot_inbox is 'Free-text messages people sent to the Telegram sales bot. Service role only.';

create or replace function public.sales_stats(p_days integer default 7)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with l as (
    select product, status
    from public.sales_leads
    where created_at >= now() - make_interval(days => p_days)
  ),
  e as (
    select kind, coalesce(product, '-') as product
    from public.sales_events
    where created_at >= now() - make_interval(days => p_days)
  )
  select jsonb_build_object(
    'days', p_days,
    'leads_total', (select count(*) from l),
    'leads_by_product', coalesce((select jsonb_object_agg(product, n) from (select product, count(*) as n from l group by product) x), '{}'::jsonb),
    'leads_by_status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) as n from l group by status) x), '{}'::jsonb),
    'events', coalesce((select jsonb_object_agg(k, n) from (select kind || ':' || product as k, count(*) as n from e group by 1) x), '{}'::jsonb),
    'bot_messages', (select count(*) from public.sales_bot_inbox where created_at >= now() - make_interval(days => p_days)),
    'all_time_leads', (select count(*) from public.sales_leads),
    'paid_all_time', (select count(*) from public.sales_leads where status = 'paid'),
    'bot_users', (select count(*) from public.sales_bot_users where not is_admin)
  );
$$;

revoke all on function public.sales_stats(integer) from public, anon, authenticated;
grant execute on function public.sales_stats(integer) to service_role;
comment on function public.sales_stats(integer) is 'Lead, page-event and bot-message counts for the sales bot /stats command. service_role only.';
