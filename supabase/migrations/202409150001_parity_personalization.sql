-- Ensure UUID generation is available
create extension if not exists "pgcrypto";

-- Extend personalization storage
alter table if exists user_personalization
  add column if not exists travel_interests text[] default '{}'::text[],
  add column if not exists preferred_continents text[] default '{}'::text[],
  add column if not exists favorite_categories text[] default '{}'::text[],
  add column if not exists monthly_budget_goal numeric;

alter table if exists user_profile
  add column if not exists travel_interests text[] default '{}'::text[],
  add column if not exists preferred_continents text[] default '{}'::text[],
  add column if not exists favorite_categories text[] default '{}'::text[],
  add column if not exists monthly_budget_goal numeric;

-- Track generated nudges for users
create table if not exists nudges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  message text not null,
  subtitle text,
  category text,
  tone text,
  icon text,
  action_label text,
  action_url text,
  impact numeric,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists nudges_user_id_created_at_idx on nudges(user_id, created_at desc);

-- Preserve account balance history
create table if not exists account_balance_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  account_id uuid references accounts(id) on delete cascade,
  nessie_account_id text,
  balance numeric not null,
  currency_code text,
  captured_at timestamptz not null default timezone('utc', now())
);

create index if not exists account_balance_snapshots_user_idx on account_balance_snapshots(user_id, captured_at desc);

-- Enrich transaction history metadata
alter table if exists transactions
  add column if not exists description text,
  add column if not exists category_confidence numeric,
  add column if not exists origin text;

-- GeoBudget interest metadata
alter table if exists ppp_city
  add column if not exists continent text,
  add column if not exists interests text[] default '{}'::text[],
  add column if not exists category_tags text[] default '{}'::text[];

create table if not exists ppp_city_interest (
  city_code text references ppp_city(code) on delete cascade,
  interest text not null,
  constraint ppp_city_interest_pkey primary key (city_code, interest)
);
