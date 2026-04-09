-- SiteFlow Database Schema
-- Run this in your Supabase SQL editor

-- Workers / Crew
create table workers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  role text,
  created_at timestamptz default now()
);

-- Jobs
create table jobs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  scope text,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'done')),
  percent_complete integer not null default 0 check (percent_complete between 0 and 100),
  total_value numeric(12,2) not null default 0,
  amount_billed numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  client_name text,
  client_phone text,
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
