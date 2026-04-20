-- SiteFlow Database Schema
-- Run this in your Supabase SQL editor

-- Platform users
create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  platform_role text not null default 'org_user' check (platform_role in ('admin', 'support', 'org_user')),
  created_at timestamptz default now()
);

-- Organizations
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  phone text,
  status text not null default 'trial',
  plan text not null default 'trial',
  track_worker_time boolean not null default false,
  co_separate_invoice boolean not null default false,
  require_signature boolean not null default false,
  track_worker_job boolean not null default false,
  created_at timestamptz default now()
);

-- Custom roles per org
create table org_roles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  color text not null default '#6b7280',
  permissions jsonb not null default '{}',
  created_at timestamptz default now()
);

-- Org membership (users <-> orgs)
create table org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'worker' check (role in ('owner', 'worker')),
  permissions jsonb not null default '{}',
  worker_id uuid,
  org_role_id uuid references org_roles(id) on delete set null,
  created_at timestamptz default now(),
  unique(org_id, user_id)
);

-- Mobile app sessions
create table mobile_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  session_token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index mobile_sessions_user_id_idx on mobile_sessions(user_id);
create index mobile_sessions_expires_at_idx on mobile_sessions(expires_at);

-- Platform-wide key/value settings (feature flags, plan config, etc.)
create table platform_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Workers / Crew
create table workers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  phone text,
  role text,
  hourly_rate numeric(10,2),
  created_at timestamptz default now()
);

-- Jobs
create table jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  address text,
  scope text,
  status text not null default 'not_started' check (status in ('not_started', 'planned', 'in_progress', 'done')),
  percent_complete integer not null default 0 check (percent_complete between 0 and 100),
  total_value numeric(12,2) not null default 0,
  amount_billed numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  client_name text,
  client_phone text,
  planned_start date,
  start_date date,
  end_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Job crew assignments (many-to-many)
create table job_workers (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  worker_id uuid not null references workers(id) on delete cascade,
  unique(job_id, worker_id)
);

-- Change orders
create table change_orders (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null,
  approved boolean not null default false,
  created_at timestamptz default now()
);

-- Job photos
create table job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  storage_path text not null,
  caption text,
  created_at timestamptz default now()
);

-- Indexes
create index on jobs(status);
create index on job_workers(job_id);
create index on job_workers(worker_id);
create index on change_orders(job_id);
create index on job_photos(job_id);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger jobs_updated_at
  before update on jobs
  for each row execute procedure update_updated_at();

-- Storage bucket for job photos (run in Supabase dashboard or via API)
-- insert into storage.buckets (id, name, public) values ('job-photos', 'job-photos', true);
