-- ============================================================================
-- MIGRATION: Real Funds, Wallets, KYC Cases, Trade Allocations & Investments
-- ============================================================================

-- 1. WALLETS TABLE (Real & Demo balances, multi-wallets, leverage)
create table if not exists public.wallets (
  user_id uuid not null,
  live_balance numeric(14, 2) not null default 0.00,
  demo_balance numeric(14, 2) not null default 10000.00,
  main_wallet numeric(14, 2) not null default 0.00,
  synthetic_wallet numeric(14, 2) not null default 0.00,
  live_market_wallet numeric(14, 2) not null default 0.00,
  leverage text not null default '1:500'::text,
  updated_at timestamp with time zone not null default now(),
  constraint wallets_pkey primary key (user_id),
  constraint wallets_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint wallets_demo_balance_check check ((demo_balance >= (0)::numeric)),
  constraint wallets_live_balance_check check ((live_balance >= (0)::numeric))
) tablespace pg_default;

alter table public.wallets enable row level security;
grant select, insert, update on public.wallets to authenticated;

drop policy if exists "Users and admins can read and manage wallets" on public.wallets;
create policy "Users and admins can read and manage wallets"
  on public.wallets for all
  to authenticated
  using (
    (select auth.uid()) = user_id
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    (select auth.uid()) = user_id
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- 2. USER TRADE ALLOCATIONS (Admin control for profit/loss outcome per user)
create table if not exists public.user_trade_allocations (
  user_id uuid not null,
  trade_outcome text not null default 'HOUSE_LOSS'::text,
  win_rate integer not null default 85,
  updated_at timestamp with time zone not null default now(),
  constraint user_trade_allocations_pkey primary key (user_id),
  constraint user_trade_allocations_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint user_trade_allocations_trade_outcome_check check (
    (
      trade_outcome = any (array['FORCE_PROFIT'::text, 'HOUSE_LOSS'::text, 'FORCE_LOSS'::text])
    )
  ),
  constraint user_trade_allocations_win_rate_check check (
    (
      (win_rate >= 0)
      and (win_rate <= 100)
    )
  )
) tablespace pg_default;

alter table public.user_trade_allocations enable row level security;
grant select, insert, update on public.user_trade_allocations to authenticated;

drop policy if exists "Users and admins can manage trade allocations" on public.user_trade_allocations;
create policy "Users and admins can manage trade allocations"
  on public.user_trade_allocations for all
  to authenticated
  using (
    (select auth.uid()) = user_id
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or (select auth.uid()) = user_id
  );

-- 3. KYC CASES TABLE (Real user KYC verification data for admin review)
create table if not exists public.kyc_cases (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  provider text not null default 'manual',
  provider_case_id text not null default gen_random_uuid()::text,
  status text not null default 'pending'::text,
  submitted_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  reviewed_by uuid null,
  reviewer_note text not null default ''::text,
  constraint kyc_cases_pkey primary key (id),
  constraint kyc_cases_provider_provider_case_id_key unique (provider, provider_case_id),
  constraint kyc_cases_reviewed_by_fkey foreign key (reviewed_by) references auth.users (id),
  constraint kyc_cases_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint kyc_cases_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'approved'::text,
          'rejected'::text,
          'needs_more_info'::text
        ]
      )
    )
  )
) tablespace pg_default;

create index if not exists kyc_cases_created_idx on public.kyc_cases using btree (status, submitted_at desc) tablespace pg_default;

alter table public.kyc_cases enable row level security;
grant select, insert, update on public.kyc_cases to authenticated;

drop policy if exists "Users and admins can read KYC cases" on public.kyc_cases;
create policy "Users and admins can read KYC cases"
  on public.kyc_cases for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "Admins can update KYC cases" on public.kyc_cases;
create policy "Admins can update KYC cases"
  on public.kyc_cases for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 4. USER INVESTMENTS TABLE (Using allocated wallet funds for coin investments)
create table if not exists public.user_investments (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  account_type text not null default 'demo'::text,
  tier_id text not null,
  tier_name text not null,
  principal_stake numeric(14, 2) not null,
  projected_payout numeric(14, 2) not null,
  duration_days integer not null default 21,
  status text not null default 'active'::text,
  started_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null default (now() + '21 days'::interval),
  constraint user_investments_pkey primary key (id),
  constraint user_investments_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint user_investments_account_type_check check (
    (
      account_type = any (array['demo'::text, 'live'::text])
    )
  ),
  constraint user_investments_status_check check (
    (
      status = any (
        array[
          'active'::text,
          'completed'::text,
          'cancelled'::text
        ]
      )
    )
  )
) tablespace pg_default;

create index if not exists idx_user_investments_user_id on public.user_investments using btree (user_id, started_at desc) tablespace pg_default;

alter table public.user_investments enable row level security;
grant select, insert, update on public.user_investments to authenticated;

drop policy if exists "Users and admins can manage investments" on public.user_investments;
create policy "Users and admins can manage investments"
  on public.user_investments for all
  to authenticated
  using (
    (select auth.uid()) = user_id
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    (select auth.uid()) = user_id
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- 5. WALLET DEDUCTION TRIGGER FUNCTION FOR INVESTMENTS
create or replace function public.deduct_investment_stake_from_wallet()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.account_type = 'live' then
    update public.wallets
    set live_balance = greatest(0, live_balance - new.principal_stake),
        main_wallet = greatest(0, main_wallet - new.principal_stake),
        updated_at = now()
    where user_id = new.user_id;
  else
    update public.wallets
    set demo_balance = greatest(0, demo_balance - new.principal_stake),
        updated_at = now()
    where user_id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_investment_created_deduct_wallet on public.user_investments;
create trigger on_investment_created_deduct_wallet
after insert on public.user_investments
for each row
execute function public.deduct_investment_stake_from_wallet();

-- 6. REALTIME PUBLICATION SETUP
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wallets'
  ) then
    alter publication supabase_realtime add table public.wallets;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_trade_allocations'
  ) then
    alter publication supabase_realtime add table public.user_trade_allocations;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'kyc_cases'
  ) then
    alter publication supabase_realtime add table public.kyc_cases;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_investments'
  ) then
    alter publication supabase_realtime add table public.user_investments;
  end if;
end;
$$;
