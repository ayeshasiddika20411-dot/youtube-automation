# Deployment Guide — AI Content Studio v1.0

This project uses a **hybrid** deployment: the web app on Vercel, the heavy worker on GitHub Actions.

## 1. Deploy the web app to Vercel

1. Push the repo to GitHub.
2. In Vercel, **Import Project** and select the repo.
3. Framework preset: **Next.js** (auto-detected).
4. Add all environment variables from `.env.example` (see `INSTALLATION.md`).
5. Deploy.

> **Important**: `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`, `GITHUB_TOKEN`, `CRON_SECRET`, `ENCRYPTION_KEY`, and all provider API keys are **server-only** and must NOT be prefixed with `NEXT_PUBLIC_`. Only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_APP_URL` are public.

### Vercel serverless timeout note
Free-tier Vercel functions have a ~10–60s timeout. The web app only handles **light** pipeline stages (research/script/seo/scene planning) and CRUD. Heavy stages run on GitHub Actions, so they won't hit the timeout.

## 2. Set up Supabase (production)

- Apply the migration: **`supabase/migrations/0001_init.sql`** in the production project's SQL Editor.
- Run **`supabase/seed.sql`** if desired.
- Ensure **Row Level Security** is enabled (the migration does this).
- Set the production site URL in **Auth → URL Configuration**.

## 3. Configure GitHub Actions

Add the following **repository secrets** (Settings → Secrets and variables → Actions):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY`
- `AI_PROVIDER`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `GROQ_API_KEY`
- `STOCK_MEDIA_PROVIDER`
- `PEXELS_API_KEY`
- `PIXABAY_API_KEY`
- `DEFAULT_VOICE`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `YOUTUBE_REDIRECT_URI`
- `CRON_SECRET`
- `GITHUB_TOKEN` (can use the auto-provided `secrets.GITHUB_TOKEN`)

### Workflows
- **`.github/workflows/daily-cron.yml`** — scheduled (e.g. daily) research/generate/queue/retry/cleanup/report. Optionally triggers the worker.
- **`.github/workflows/pipeline-worker.yml`** — runs the heavy-stage worker. Scheduled + `workflow_dispatch` (manual "Run workflow").

For the daily cron to trigger the worker, set the `GITHUB_REPO` environment variable and use a `GITHUB_TOKEN` with `workflow` scope.

## 4. YouTube OAuth (production)

- Set `YOUTUBE_REDIRECT_URI` to your **production** callback URL, e.g. `https://your-app.vercel.app/api/youtube/oauth/callback`.
- Add that exact URL as a redirect URI in your Google OAuth client.
- Users must re-connect YouTube once in production (or you can migrate refresh tokens).

## 5. Post-deploy checklist

- [ ] `npm run build` passes locally.
- [ ] `npm run test` passes.
- [ ] Supabase migration applied in production.
- [ ] All environment variables set in Vercel + GitHub Actions.
- [ ] YouTube OAuth redirect URI updated.
- [ ] First job runs end-to-end and uploads to YouTube.
