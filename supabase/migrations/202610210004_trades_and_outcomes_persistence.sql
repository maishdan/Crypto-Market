-- =============================================================================
-- MIGRATION: Trades Table, RLS Policies, Realtime & Admin Trade Allocations
-- =============================================================================

-- 1. TRADES TABLE (PERSISTENCE FOR OPEN & CLOSED TRADES)
create table if not exists public.trades (
  id bigint primary key generated always as identity,
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  direction text not null check (direction in ('BUY', 'SELL')),
  lots numeric(12, 4) not null default 1.0,
  open_price numeric(14, 5) not null,
  close_price numeric(14, 5) null,
  profit_loss numeric(14, 2) not null default 0.00,
  status text not null default 'OPEN' check (status in ('OPEN', 'CLOSED')),
  account_type text not null default 'live' check (account_type in ('demo', 'live')),
  created_at timestamptz not null default now(),
  closed_at timestamptz null
);

create index if not exists idx_trades_user_status on public.trades (user_id, status, created_at desc);

alter table public.trades enable row level security;
grant select, insert, update, delete on public.trades to authenticated;

drop policy if exists "Users and admins can manage trades" on public.trades;
create policy "Users and admins can manage trades"
  on public.trades for all
  to authenticated
  using (
    (select auth.uid()) = user_id or public.is_admin()
  )
  with check (
    (select auth.uid()) = user_id or public.is_admin()
  );

-- 2. USER TRADE ALLOCATIONS TABLE (ADMIN OUTCOME OVERRIDE PER ACCOUNT)
create table if not exists public.user_trade_allocations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  trade_outcome text not null default 'HOUSE_LOSS' check (trade_outcome in ('FORCE_PROFIT', 'HOUSE_LOSS', 'FORCE_LOSS')),
  win_rate integer not null default 85 check (win_rate >= 0 and win_rate <= 100),
  updated_at timestamptz not null default now()
);

alter table public.user_trade_allocations enable row level security;
grant select, insert, update, delete on public.user_trade_allocations to authenticated;

drop policy if exists "Users and admins can read and manage allocations" on public.user_trade_allocations;
create policy "Users and admins can read and manage allocations"
  on public.user_trade_allocations for all
  to authenticated
  using (
    (select auth.uid()) = user_id or public.is_admin()
  )
  with check (
    (select auth.uid()) = user_id or public.is_admin()
  );

-- 3. ADD REALTIME PUBLICATIONS
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trades'
  ) then
    alter publication supabase_realtime add table public.trades;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_trade_allocations'
  ) then
    alter publication supabase_realtime add table public.user_trade_allocations;
  end if;
end;
$$;
