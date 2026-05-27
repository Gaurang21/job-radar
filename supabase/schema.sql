-- ─────────────────────────────────────────────────────────────
-- JobRadar — Supabase Schema + Row-Level Security Policies
-- Run this in the Supabase SQL Editor (Database → SQL Editor → New)
-- ─────────────────────────────────────────────────────────────

-- Extensions
create extension if not exists "uuid-ossp";

-- ─── Profiles (extends auth.users) ────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  avatar_url    text,
  is_admin      boolean default false,
  digest_opt_in boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─── Resumes ──────────────────────────────────────────────────
create table if not exists public.resumes (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  version          int not null default 1,
  raw_text         text not null,
  skills           jsonb not null default '[]'::jsonb,
  titles           jsonb not null default '[]'::jsonb,
  experience_years int default 0,
  education        jsonb not null default '[]'::jsonb,
  location         text,
  desired_role     text,
  summary          text,
  file_path        text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists idx_resumes_user on public.resumes(user_id);

-- ─── Jobs ─────────────────────────────────────────────────────
create table if not exists public.jobs (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  external_id        text not null,
  title              text not null,
  company            text not null,
  location           text,
  salary_min         numeric,
  salary_max         numeric,
  salary_currency    text default 'USD',
  job_type           text,
  seniority          text,
  description        text not null,
  requirements       text,
  responsibilities   text,
  application_url    text not null,
  source             text not null,
  posted_date        timestamptz,
  closing_date       timestamptz,
  match_score        int default 0,
  match_reasons      jsonb default '[]'::jsonb,
  why_match          text,
  ai_summary         jsonb,
  skill_gaps         jsonb,
  hiring_manager     text,
  hiring_manager_url text,
  company_size       text,
  company_funding    text,
  company_industry   text,
  company_rating     numeric,
  duplicate_of       uuid,
  duplicate_sources  jsonb default '[]'::jsonb,
  saved              boolean default false,
  scored             boolean default false,
  resume_version     int,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now(),
  unique (user_id, external_id)
);
create index if not exists idx_jobs_user_score on public.jobs(user_id, match_score desc);
create index if not exists idx_jobs_user_created on public.jobs(user_id, created_at desc);

-- ─── Pipeline ─────────────────────────────────────────────────
create table if not exists public.pipeline_items (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  job_id     uuid not null references public.jobs(id) on delete cascade,
  stage      text not null default 'saved',
  notes      text,
  deadline   timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (job_id)
);
create index if not exists idx_pipeline_user_stage on public.pipeline_items(user_id, stage);

create table if not exists public.pipeline_history (
  id               uuid primary key default uuid_generate_v4(),
  pipeline_item_id uuid not null references public.pipeline_items(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  from_stage       text,
  to_stage         text not null,
  created_at       timestamptz default now()
);

-- ─── Notifications ────────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,
  title      text not null,
  message    text not null,
  job_id     uuid,
  read       boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_notifications_user_read on public.notifications(user_id, read, created_at desc);

-- ─── AI Settings ──────────────────────────────────────────────
create table if not exists public.ai_settings (
  user_id                     uuid primary key references auth.users(id) on delete cascade,
  anthropic_api_key_encrypted text,
  match_scoring_enabled       boolean default true,
  why_match_enabled           boolean default true,
  job_summary_enabled         boolean default true,
  skill_gap_enabled           boolean default true,
  cover_letter_enabled        boolean default true,
  interview_prep_enabled      boolean default true,
  email_draft_enabled         boolean default true,
  linkedin_analyzer_enabled   boolean default true,
  market_pulse_enabled        boolean default true,
  rejection_analyzer_enabled  boolean default true,
  cover_letter_tone           text default 'friendly',
  updated_at                  timestamptz default now()
);

-- ─── Market Trends ────────────────────────────────────────────
create table if not exists public.market_trends (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  target_role text,
  location    text,
  summary     jsonb not null,
  created_at  timestamptz default now()
);
create index if not exists idx_market_user_created on public.market_trends(user_id, created_at desc);

-- ─── Company Insights (shared cache) ──────────────────────────
create table if not exists public.company_insights (
  id           uuid primary key default uuid_generate_v4(),
  company_name text not null unique,
  size         text,
  funding_stage text,
  industry     text,
  rating       numeric,
  data         jsonb,
  created_at   timestamptz default now()
);

-- ─── Per-user Settings (k/v) ──────────────────────────────────
create table if not exists public.settings (
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null,
  value      text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, key)
);

-- ─── Row Level Security ──────────────────────────────────────
alter table public.profiles         enable row level security;
alter table public.resumes          enable row level security;
alter table public.jobs             enable row level security;
alter table public.pipeline_items   enable row level security;
alter table public.pipeline_history enable row level security;
alter table public.notifications    enable row level security;
alter table public.ai_settings      enable row level security;
alter table public.market_trends    enable row level security;
alter table public.settings         enable row level security;
alter table public.company_insights enable row level security;

drop policy if exists "self_profiles"          on public.profiles;
drop policy if exists "self_resumes"           on public.resumes;
drop policy if exists "self_jobs"              on public.jobs;
drop policy if exists "self_pipeline"          on public.pipeline_items;
drop policy if exists "self_pipeline_history"  on public.pipeline_history;
drop policy if exists "self_notifications"     on public.notifications;
drop policy if exists "self_ai_settings"       on public.ai_settings;
drop policy if exists "self_market_trends"     on public.market_trends;
drop policy if exists "self_settings"          on public.settings;
drop policy if exists "read_company_insights"  on public.company_insights;
drop policy if exists "service_company_insights" on public.company_insights;

create policy "self_profiles"          on public.profiles         for all using (id = auth.uid()) with check (id = auth.uid());
create policy "self_resumes"           on public.resumes          for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "self_jobs"              on public.jobs             for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "self_pipeline"          on public.pipeline_items   for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "self_pipeline_history"  on public.pipeline_history for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "self_notifications"     on public.notifications    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "self_ai_settings"       on public.ai_settings      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "self_market_trends"     on public.market_trends    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "self_settings"          on public.settings         for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "read_company_insights"  on public.company_insights for select using (true);
create policy "service_company_insights" on public.company_insights for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- ─── Auto-create profile + ai_settings on signup ─────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  insert into public.ai_settings (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Pipeline history trigger ────────────────────────────────
create or replace function public.log_pipeline_change()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.pipeline_history (pipeline_item_id, user_id, from_stage, to_stage)
    values (new.id, new.user_id, null, new.stage);
  elsif (tg_op = 'UPDATE' and old.stage is distinct from new.stage) then
    insert into public.pipeline_history (pipeline_item_id, user_id, from_stage, to_stage)
    values (new.id, new.user_id, old.stage, new.stage);
  end if;
  return new;
end $$;

drop trigger if exists pipeline_history_trigger on public.pipeline_items;
create trigger pipeline_history_trigger
  after insert or update on public.pipeline_items
  for each row execute function public.log_pipeline_change();

-- ─── Storage bucket for resumes ──────────────────────────────
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

drop policy if exists "self_resume_upload" on storage.objects;
drop policy if exists "self_resume_read"   on storage.objects;
drop policy if exists "self_resume_delete" on storage.objects;

create policy "self_resume_upload" on storage.objects for insert with check (
  bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "self_resume_read" on storage.objects for select using (
  bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "self_resume_delete" on storage.objects for delete using (
  bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
);
