# Supabase Full Database Setup & Migration Script

Run this complete SQL script in your [Supabase SQL Editor](https://supabase.com/dashboard) to ensure all tables, columns, RLS permissions, grants, views, and Realtime publications are correctly created and fully accessible.

## SQL Script

```sql
-- ============================================================================
-- FULL SUPABASE PRODUCTION SETUP & MIGRATION SCRIPT
-- Copy and paste this entire script into your Supabase SQL Editor and click RUN.
-- ============================================================================

-- 1. Helper function for admin check
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') or
    (current_setting('request.jwt.claims', true)::json -> 'app_metadata' ->> 'role' = 'admin'),
    false
  );
$$;

-- 2. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key,
  full_name text not null default '',
  avatar_path text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
grant select, insert, update, delete on public.profiles to authenticated, anon;
drop policy if exists "Enable all access for profiles" on public.profiles;
create policy "Enable all access for profiles" on public.profiles for all to authenticated, anon using (true) with check (true);

-- 3. WALLETS TABLE
create table if not exists public.wallets (
  user_id uuid primary key,
  live_balance numeric(14, 2) not null default 0.00,
  demo_balance numeric(14, 2) not null default 10000.00,
  main_wallet numeric(14, 2) not null default 0.00,
  synthetic_wallet numeric(14, 2) not null default 0.00,
  live_market_wallet numeric(14, 2) not null default 0.00,
  leverage text not null default '1:500',
  updated_at timestamptz not null default now()
);

alter table public.wallets enable row level security;
grant select, insert, update, delete on public.wallets to authenticated, anon;
drop policy if exists "Enable all access for wallets" on public.wallets;
create policy "Enable all access for wallets" on public.wallets for all to authenticated, anon using (true) with check (true);

-- 4. TRADES TABLE
create table if not exists public.trades (
  id bigint primary key generated always as identity,
  user_id uuid null,
  symbol text not null,
  direction text not null check (direction in ('BUY', 'SELL')),
  lots numeric(12, 4) not null default 1.0,
  open_price numeric(14, 5) not null,
  close_price numeric(14, 5) null,
  profit_loss numeric(14, 2) not null default 0.00,
  status text not null default 'OPEN',
  account_type text not null default 'live' check (account_type in ('demo', 'live')),
  created_at timestamptz not null default now(),
  closed_at timestamptz null
);

alter table public.trades enable row level security;
grant select, insert, update, delete on public.trades to authenticated, anon;
drop policy if exists "Enable all access for trades" on public.trades;
create policy "Enable all access for trades" on public.trades for all to authenticated, anon using (true) with check (true);

-- 5. TRANSACTIONS TABLE
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  type text not null,
  amount numeric(14, 2) not null default 0.00,
  gateway text not null default 'SYSTEM',
  gateway_network text not null default '',
  reference_code text not null default '',
  status text not null default 'pending',
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz null
);

alter table public.transactions enable row level security;
grant select, insert, update, delete on public.transactions to authenticated, anon;
drop policy if exists "Enable all access for transactions" on public.transactions;
create policy "Enable all access for transactions" on public.transactions for all to authenticated, anon using (true) with check (true);

-- 6. ADMIN DEPOSIT ADDRESSES TABLE
create table if not exists public.admin_deposit_addresses (
  id uuid primary key default gen_random_uuid(),
  gateway text not null,
  network text not null default '',
  address text not null,
  qr_code_url text not null default '',
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.admin_deposit_addresses enable row level security;
grant select, insert, update, delete on public.admin_deposit_addresses to authenticated, anon;
drop policy if exists "Enable all access for admin_deposit_addresses" on public.admin_deposit_addresses;
create policy "Enable all access for admin_deposit_addresses" on public.admin_deposit_addresses for all to authenticated, anon using (true) with check (true);

-- 7. USER TRADE ALLOCATIONS TABLE
create table if not exists public.user_trade_allocations (
  user_id uuid primary key,
  trade_outcome text not null default 'HOUSE_LOSS',
  win_rate integer not null default 85,
  updated_at timestamptz not null default now()
);

alter table public.user_trade_allocations enable row level security;
grant select, insert, update, delete on public.user_trade_allocations to authenticated, anon;
drop policy if exists "Enable all access for user_trade_allocations" on public.user_trade_allocations;
create policy "Enable all access for user_trade_allocations" on public.user_trade_allocations for all to authenticated, anon using (true) with check (true);

-- 8. PROFILE DOCUMENTS TABLE
create table if not exists public.profile_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  document_type text not null,
  original_name text not null,
  mime_type text not null,
  storage_path text not null,
  status text not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz null
);

alter table public.profile_documents enable row level security;
grant select, insert, update, delete on public.profile_documents to authenticated, anon;
drop policy if exists "Enable all access for profile_documents" on public.profile_documents;
create policy "Enable all access for profile_documents" on public.profile_documents for all to authenticated, anon using (true) with check (true);

-- 9. PROFILE SUITABILITY RESPONSES TABLE
create table if not exists public.profile_suitability_responses (
  user_id uuid primary key,
  primary_goal text not null default '',
  income_band text not null default '',
  derivative_experience text not null default '',
  risk_tolerance text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.profile_suitability_responses enable row level security;
grant select, insert, update, delete on public.profile_suitability_responses to authenticated, anon;
drop policy if exists "Enable all access for profile_suitability_responses" on public.profile_suitability_responses;
create policy "Enable all access for profile_suitability_responses" on public.profile_suitability_responses for all to authenticated, anon using (true) with check (true);

-- 10. REALTIME PUBLICATIONS
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'trades') then
    alter publication supabase_realtime add table public.trades;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'wallets') then
    alter publication supabase_realtime add table public.wallets;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'transactions') then
    alter publication supabase_realtime add table public.transactions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'user_trade_allocations') then
    alter publication supabase_realtime add table public.user_trade_allocations;
  end if;
end;
$$;
```
