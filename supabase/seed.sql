-- ============================================================
-- AI Content Studio — Seed Data
-- Creates a demo user + default settings + sample project
-- NOTE: Replace the user id / email before running in production.
-- ============================================================

-- Demo user (must already exist in auth.users)
-- Insert a profile row for the authenticated user of your choosing.
insert into public.users (id, email, display_name, default_language, timezone)
values (
  '00000000-0000-0000-0000-000000000000',
  'demo@example.com',
  'Demo User',
  'en',
  'UTC'
)
on conflict (id) do nothing;

-- Default settings for the demo user
insert into public.settings (user_id, ai_provider, voice, default_language, video_duration)
values (
  '00000000-0000-0000-0000-000000000000',
  'gemini',
  'en-US-JennyNeural',
  'en',
  60
)
on conflict (user_id) do nothing;

-- Sample active project
insert into public.projects (user_id, name, description, niche, status)
values (
  '00000000-0000-0000-0000-000000000000',
  'Tech Explainer Channel',
  'Short-form videos explaining tech concepts simply.',
  'Technology Education',
  'active'
)
on conflict do nothing;

-- Sample content job in pending state
insert into public.content_jobs (project_id, user_id, topic, status)
values (
  (select id from public.projects limit 1),
  '00000000-0000-0000-0000-000000000000',
  'What is artificial intelligence?',
  'pending'
)
on conflict do nothing;
