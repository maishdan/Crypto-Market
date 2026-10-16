-- =============================================================================
-- MIGRATION: Open & Closed Trades Table, Views, RLS Policies & Realtime Setup
-- =============================================================================

-- 1. Ensure public.trades table accepts 'OPEN', 'CLOSED', 'WIN', 'LOSS' statuses
alter table if exists public.trades drop constraint if exists trades_status_check;

alter table if exists public.trades
  add constraint trades_status_check
  check (status in ('OPEN', 'CLOSED', 'WIN', 'LOSS'));

-- 2. Open Trades View for active running positions
create or replace view public.user_open_trades_view as
select
  id,
  user_id,
  symbol,
  direction,
  lots,
  open_price,
  profit_loss,
  account_type,
  created_at
from public.trades
where status = 'OPEN'
order by created_at desc;

-- 3. Closed Trades History View for completed trade ledger
create or replace view public.user_closed_trades_view as
select
  id,
  user_id,
  symbol,
  direction,
  lots,
  open_price,
  close_price,
  profit_loss,
  status,
  account_type,
  created_at,
  closed_at
from public.trades
where status in ('CLOSED', 'WIN', 'LOSS')
order by coalesce(closed_at, created_at) desc;

-- 4. Grant Full Access to Views and Table
grant select on public.user_open_trades_view to authenticated, anon;
grant select on public.user_closed_trades_view to authenticated, anon;
grant select, insert, update, delete on public.trades to authenticated, anon;

-- 5. RLS Policies for Trades
alter table public.trades enable row level security;

drop policy if exists "Users and admins can manage all trades" on public.trades;
create policy "Users and admins can manage all trades"
  on public.trades for all
  to authenticated, anon
  using (
    (select auth.uid()) = user_id or user_id is null or public.is_admin()
  )
  with check (
    (select auth.uid()) = user_id or user_id is null or public.is_admin()
  );

-- 6. Add Realtime Publications for Trades, Wallets & Allocations
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trades'
  ) then
    alter publication supabase_realtime add table public.trades;
  end if;
end;
$$;
