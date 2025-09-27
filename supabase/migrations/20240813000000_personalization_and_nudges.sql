create extension if not exists "pgcrypto";

create or replace function trigger_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

alter table if exists user_personalization
  add column if not exists monthly_budget_goal numeric,
  add column if not exists travel_interests text[],
  add column if not exists preferred_continents text[],
  add column if not exists favorite_categories text[];

alter table if exists user_profile
  add column if not exists monthly_budget_goal numeric,
  add column if not exists travel_interests text[],
  add column if not exists preferred_continents text[],
  add column if not exists favorite_categories text[];

alter table if exists transactions
  add column if not exists normalized_category text,
  add column if not exists category_confidence numeric,
  add column if not exists category_tags text[];

alter table if exists ppp_city
  add column if not exists interests text[],
  add column if not exists categories text[];

create table if not exists user_nudges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  slug text not null,
  title text,
  message text not null,
  variant text default 'info',
  icon text default 'sparkles',
  action_label text,
  action_href text,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now()),
  unique(user_id, slug)
);

alter table user_nudges enable row level security;

create policy "Users can view their nudges" on user_nudges
  for select using (auth.uid() = user_id);

create policy "Users can insert their nudges" on user_nudges
  for insert with check (auth.uid() = user_id);

create policy "Users can update their nudges" on user_nudges
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists set_user_nudges_updated_at on user_nudges;

create trigger set_user_nudges_updated_at
  before update on user_nudges
  for each row
  execute procedure trigger_set_updated_at();
