-- ============================================================
-- AI Content Studio — Initial Migration
-- Creates all tables, enums, functions, triggers, RLS, indexes
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------
create type job_status as enum (
  'pending',
  'research',
  'script',
  'seo',
  'scene_planning',
  'stock_media',
  'voice',
  'subtitles',
  'video_rendering',
  'ready_for_review',
  'upload',
  'completed',
  'failed'
);

create type project_status as enum ('active', 'archived');

create type upload_status as enum (
  'pending',
  'authenticating',
  'uploading',
  'processing',
  'published',
  'failed'
);

create type visibility as enum ('public', 'unlisted', 'private');

-- ------------------------------------------------------------
-- updated_at trigger function
-- ------------------------------------------------------------
create or replace function trigger_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- users (profile extension of auth.users)
-- ------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  avatar_url text,
  default_language text default 'en',
  timezone text default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger users_updated_at before update on public.users
  for each row execute function trigger_set_updated_at();

-- ------------------------------------------------------------
-- settings
-- ------------------------------------------------------------
create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ai_provider text default 'gemini',           -- gemini | groq
  voice text default 'en-US-JennyNeural',
  default_language text default 'en',
  video_duration int default 60,
  upload_defaults jsonb default '{}'::jsonb,
  publishing_preferences jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create trigger settings_updated_at before update on public.settings
  for each row execute function trigger_set_updated_at();

-- ------------------------------------------------------------
-- api_keys (encrypted)
-- ------------------------------------------------------------
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,                      -- gemini | groq | pexels | pixabay
  encrypted_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create trigger api_keys_updated_at before update on public.api_keys
  for each row execute function trigger_set_updated_at();

-- ------------------------------------------------------------
-- projects
-- ------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  niche text,
  status project_status default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger projects_updated_at before update on public.projects
  for each row execute function trigger_set_updated_at();

create index if not exists projects_user_id_idx on public.projects(user_id);

-- ------------------------------------------------------------
-- content_jobs
-- ------------------------------------------------------------
create table if not exists public.content_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  script text,
  status job_status default 'pending',
  retry_count int default 0,
  last_error text,
  stage_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger content_jobs_updated_at before update on public.content_jobs
  for each row execute function trigger_set_updated_at();

create index if not exists content_jobs_status_idx on public.content_jobs(status);
create index if not exists content_jobs_user_id_idx on public.content_jobs(user_id);
create index if not exists content_jobs_project_id_idx on public.content_jobs(project_id);

-- ------------------------------------------------------------
-- scripts
-- ------------------------------------------------------------
create table if not exists public.scripts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.content_jobs(id) on delete cascade unique,
  hook text,
  introduction text,
  main_content text,
  ending text,
  cta text,
  language text default 'en',
  style text,
  length_seconds int default 60,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger scripts_updated_at before update on public.scripts
  for each row execute function trigger_set_updated_at();

-- ------------------------------------------------------------
-- seo_metadata
-- ------------------------------------------------------------
create table if not exists public.seo_metadata (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.content_jobs(id) on delete cascade unique,
  title text,
  description text,
  hashtags text[] default '{}',
  keywords text[] default '{}',
  tags text[] default '{}',
  thumbnail_title text,
  pinned_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger seo_metadata_updated_at before update on public.seo_metadata
  for each row execute function trigger_set_updated_at();

-- ------------------------------------------------------------
-- scenes
-- ------------------------------------------------------------
create table if not exists public.scenes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.content_jobs(id) on delete cascade,
  scene_index int not null,
  narration text,
  search_keywords text[] default '{}',
  duration int default 5,
  transition text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, scene_index)
);

create trigger scenes_updated_at before update on public.scenes
  for each row execute function trigger_set_updated_at();

create index if not exists scenes_job_id_idx on public.scenes(job_id);

-- ------------------------------------------------------------
-- stock_assets
-- ------------------------------------------------------------
create table if not exists public.stock_assets (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.content_jobs(id) on delete cascade,
  scene_id uuid references public.scenes(id) on delete set null,
  provider text,
  source_url text,
  local_path text,
  license_info text,
  fallback_used boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger stock_assets_updated_at before update on public.stock_assets
  for each row execute function trigger_set_updated_at();

create index if not exists stock_assets_job_id_idx on public.stock_assets(job_id);
create index if not exists stock_assets_scene_id_idx on public.stock_assets(scene_id);

-- ------------------------------------------------------------
-- voice_files
-- ------------------------------------------------------------
create table if not exists public.voice_files (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.content_jobs(id) on delete cascade,
  storage_path text,
  voice_name text,
  duration numeric,
  format text default 'mp3',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger voice_files_updated_at before update on public.voice_files
  for each row execute function trigger_set_updated_at();

create index if not exists voice_files_job_id_idx on public.voice_files(job_id);

-- ------------------------------------------------------------
-- subtitle_files
-- ------------------------------------------------------------
create table if not exists public.subtitle_files (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.content_jobs(id) on delete cascade,
  storage_path text,
  format text default 'srt',
  has_word_timestamps boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, format)
);

create trigger subtitle_files_updated_at before update on public.subtitle_files
  for each row execute function trigger_set_updated_at();

create index if not exists subtitle_files_job_id_idx on public.subtitle_files(job_id);

-- ------------------------------------------------------------
-- videos
-- ------------------------------------------------------------
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.content_jobs(id) on delete cascade unique,
  storage_path text,
  resolution text,
  duration numeric,
  thumbnail jsonb default '{}'::jsonb,
  status text default 'ready',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger videos_updated_at before update on public.videos
  for each row execute function trigger_set_updated_at();

-- ------------------------------------------------------------
-- youtube_uploads
-- ------------------------------------------------------------
create table if not exists public.youtube_uploads (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.content_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text,
  url text,
  publish_status upload_status default 'pending',
  title text,
  visibility visibility default 'public',
  playlist_id text,
  category text,
  language text default 'en',
  uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger youtube_uploads_updated_at before update on public.youtube_uploads
  for each row execute function trigger_set_updated_at();

create index if not exists youtube_uploads_job_id_idx on public.youtube_uploads(job_id);
create index if not exists youtube_uploads_user_id_idx on public.youtube_uploads(user_id);

-- ------------------------------------------------------------
-- cron_logs
-- ------------------------------------------------------------
create table if not exists public.cron_logs (
  id uuid primary key default gen_random_uuid(),
  run_id text,
  task_name text,
  started_at timestamptz default now(),
  finished_at timestamptz,
  status text,
  summary jsonb default '{}'::jsonb
);

create index if not exists cron_logs_run_id_idx on public.cron_logs(run_id);
create index if not exists cron_logs_task_name_idx on public.cron_logs(task_name);

-- ------------------------------------------------------------
-- system_logs
-- ------------------------------------------------------------
create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.content_jobs(id) on delete set null,
  level text default 'info',                   -- info | warn | error | debug
  message text,
  context jsonb default '{}'::jsonb,
  duration_ms int,
  created_at timestamptz not null default now()
);

create index if not exists system_logs_job_id_idx on public.system_logs(job_id);
create index if not exists system_logs_created_at_idx on public.system_logs(created_at);
create index if not exists system_logs_level_idx on public.system_logs(level);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.users enable row level security;
alter table public.settings enable row level security;
alter table public.api_keys enable row level security;
alter table public.projects enable row level security;
alter table public.content_jobs enable row level security;
alter table public.scripts enable row level security;
alter table public.seo_metadata enable row level security;
alter table public.scenes enable row level security;
alter table public.stock_assets enable row level security;
alter table public.voice_files enable row level security;
alter table public.subtitle_files enable row level security;
alter table public.videos enable row level security;
alter table public.youtube_uploads enable row level security;
alter table public.system_logs enable row level security;
alter table public.cron_logs enable row level security;

-- users: user can manage own profile
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users for select using (auth.uid() = id);
drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own" on public.users for insert with check (auth.uid() = id);
drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users for update using (auth.uid() = id);

-- settings
drop policy if exists "settings_select_own" on public.settings;
create policy "settings_select_own" on public.settings for select using (auth.uid() = user_id);
drop policy if exists "settings_insert_own" on public.settings;
create policy "settings_insert_own" on public.settings for insert with check (auth.uid() = user_id);
drop policy if exists "settings_update_own" on public.settings;
create policy "settings_update_own" on public.settings for update using (auth.uid() = user_id);

-- api_keys
drop policy if exists "api_keys_select_own" on public.api_keys;
create policy "api_keys_select_own" on public.api_keys for select using (auth.uid() = user_id);
drop policy if exists "api_keys_insert_own" on public.api_keys;
create policy "api_keys_insert_own" on public.api_keys for insert with check (auth.uid() = user_id);
drop policy if exists "api_keys_delete_own" on public.api_keys;
create policy "api_keys_delete_own" on public.api_keys for delete using (auth.uid() = user_id);

-- projects
drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own" on public.projects for select using (auth.uid() = user_id);
drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects for insert with check (auth.uid() = user_id);
drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects for update using (auth.uid() = user_id);
drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own" on public.projects for delete using (auth.uid() = user_id);

-- content_jobs
drop policy if exists "content_jobs_select_own" on public.content_jobs;
create policy "content_jobs_select_own" on public.content_jobs for select using (auth.uid() = user_id);
drop policy if exists "content_jobs_insert_own" on public.content_jobs;
create policy "content_jobs_insert_own" on public.content_jobs for insert with check (auth.uid() = user_id);
drop policy if exists "content_jobs_update_own" on public.content_jobs;
create policy "content_jobs_update_own" on public.content_jobs for update using (auth.uid() = user_id);
drop policy if exists "content_jobs_delete_own" on public.content_jobs;
create policy "content_jobs_delete_own" on public.content_jobs for delete using (auth.uid() = user_id);

-- scripts
drop policy if exists "scripts_select_own" on public.scripts;
create policy "scripts_select_own" on public.scripts for select using (auth.uid() = (select user_id from public.content_jobs where id = job_id));
drop policy if exists "scripts_insert_own" on public.scripts;
create policy "scripts_insert_own" on public.scripts for insert with check (auth.uid() = (select user_id from public.content_jobs where id = job_id));
drop policy if exists "scripts_update_own" on public.scripts;
create policy "scripts_update_own" on public.scripts for update using (auth.uid() = (select user_id from public.content_jobs where id = job_id));

-- seo_metadata
drop policy if exists "seo_metadata_select_own" on public.seo_metadata;
create policy "seo_metadata_select_own" on public.seo_metadata for select using (auth.uid() = (select user_id from public.content_jobs where id = job_id));
drop policy if exists "seo_metadata_update_own" on public.seo_metadata;
create policy "seo_metadata_update_own" on public.seo_metadata for update using (auth.uid() = (select user_id from public.content_jobs where id = job_id));

-- scenes
drop policy if exists "scenes_select_own" on public.scenes;
create policy "scenes_select_own" on public.scenes for select using (auth.uid() = (select user_id from public.content_jobs where id = job_id));
drop policy if exists "scenes_insert_own" on public.scenes;
create policy "scenes_insert_own" on public.scenes for insert with check (auth.uid() = (select user_id from public.content_jobs where id = job_id));
drop policy if exists "scenes_update_own" on public.scenes;
create policy "scenes_update_own" on public.scenes for update using (auth.uid() = (select user_id from public.content_jobs where id = job_id));

-- stock_assets
drop policy if exists "stock_assets_select_own" on public.stock_assets;
create policy "stock_assets_select_own" on public.stock_assets for select using (auth.uid() = (select user_id from public.content_jobs where id = job_id));

-- voice_files
drop policy if exists "voice_files_select_own" on public.voice_files;
create policy "voice_files_select_own" on public.voice_files for select using (auth.uid() = (select user_id from public.content_jobs where id = job_id));
drop policy if exists "voice_files_insert_own" on public.voice_files;
create policy "voice_files_insert_own" on public.voice_files for insert with check (auth.uid() = (select user_id from public.content_jobs where id = job_id));

-- subtitle_files
drop policy if exists "subtitle_files_select_own" on public.subtitle_files;
create policy "subtitle_files_select_own" on public.subtitle_files for select using (auth.uid() = (select user_id from public.content_jobs where id = job_id));
drop policy if exists "subtitle_files_insert_own" on public.subtitle_files;
create policy "subtitle_files_insert_own" on public.subtitle_files for insert with check (auth.uid() = (select user_id from public.content_jobs where id = job_id));

-- videos
drop policy if exists "videos_select_own" on public.videos;
create policy "videos_select_own" on public.videos for select using (auth.uid() = (select user_id from public.content_jobs where id = job_id));
drop policy if exists "videos_insert_own" on public.videos;
create policy "videos_insert_own" on public.videos for insert with check (auth.uid() = (select user_id from public.content_jobs where id = job_id));

-- youtube_uploads
drop policy if exists "youtube_uploads_select_own" on public.youtube_uploads;
create policy "youtube_uploads_select_own" on public.youtube_uploads for select using (auth.uid() = user_id);
drop policy if exists "youtube_uploads_insert_own" on public.youtube_uploads;
create policy "youtube_uploads_insert_own" on public.youtube_uploads for insert with check (auth.uid() = user_id);
drop policy if exists "youtube_uploads_update_own" on public.youtube_uploads;
create policy "youtube_uploads_update_own" on public.youtube_uploads for update using (auth.uid() = user_id);

-- system_logs (service role writes; users read own job logs)
drop policy if exists "system_logs_select_own" on public.system_logs;
create policy "system_logs_select_own" on public.system_logs for select using (
  auth.uid() = (select user_id from public.content_jobs where id = job_id)
);

-- cron_logs: service role only, no user policies needed
