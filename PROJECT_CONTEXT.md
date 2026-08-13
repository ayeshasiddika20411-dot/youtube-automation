# Project Context: AI Content Studio

## Purpose

AI Content Studio is a Next.js application that automates a faceless YouTube-video workflow:

`topic -> research -> script -> SEO -> scene plan -> stock media -> voiceover -> subtitles -> rendered video -> review -> YouTube upload`

It is designed for a low-cost deployment model:

- **Vercel:** dashboard, authentication, CRUD, OAuth, and lightweight text-generation stages.
- **Supabase:** Auth and Postgres database with Row Level Security (RLS).
- **GitHub Actions worker:** media downloading, TTS, subtitles, FFmpeg rendering, and YouTube upload.

Do not attempt to run FFmpeg/video rendering inside Vercel serverless routes.

## Stack

- Next.js 16, React 19, TypeScript, Tailwind CSS
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- Gemini or Groq for AI generation
- Pexels or Pixabay for stock media
- `msedge-tts` for narration
- `fluent-ffmpeg` and FFmpeg for rendering
- Google `googleapis` for YouTube OAuth2 and uploads
- Vitest for unit tests

## Repository Layout

```text
src/app/                 Next.js pages and API route handlers
src/components/          Dashboard, settings, layout, and UI components
src/lib/ai/              Gemini/Groq adapters
src/lib/stockMedia/      Pexels/Pixabay adapters
src/lib/pipeline/        Orchestrator and stage implementations
src/lib/video/           FFmpeg renderer
src/lib/voice/           Edge TTS adapter
src/lib/youtube/         OAuth client and uploader
src/lib/repositories/    Supabase data access layer
src/lib/supabase/        Browser/server Supabase clients
src/types/               DB and pipeline types
scripts/worker.ts        Heavy-stage worker; run locally or in GitHub Actions
supabase/migrations/     Database schema and RLS policies
tests/                   Unit tests
.github/workflows/       GitHub Actions worker schedules
```

## Pipeline

`content_jobs.status` is the pipeline state machine:

```text
pending
  -> research
  -> script
  -> seo
  -> scene_planning
  -> stock_media
  -> voice
  -> subtitles
  -> video_rendering
  -> ready_for_review
  -> upload
  -> completed
```

`failed` is the terminal failure state. The orchestrator retries a failed stage up to `MAX_RETRIES` (default: 3) and writes operational events to `system_logs`.

### Execution ownership

| Stages | Runner | How to trigger |
|---|---|---|
| `pending`, `research`, `script`, `seo`, `scene_planning` | Vercel API route | Dashboard **Advance** button / `POST /api/jobs/[id]/advance` |
| `stock_media`, `voice`, `subtitles`, `video_rendering`, `upload` | GitHub Actions or local Node worker | `npm run worker` or **Pipeline Worker** workflow |
| `ready_for_review` | User | Approve in dashboard; status becomes `upload` |

The worker advances a heavy job by one stage per execution. For manual testing, run the worker repeatedly until the job reaches `ready_for_review`, approve it, then run it again to upload.

## Database and Auth

The authoritative schema is `supabase/migrations/0001_init.sql`.

Important tables:

- `users`, `settings`, `api_keys`
- `projects`, `content_jobs`
- `scripts`, `seo_metadata`, `scenes`, `stock_assets`
- `voice_files`, `subtitle_files`, `videos`, `youtube_uploads`
- `system_logs`, `cron_logs`

All user-facing data is protected by RLS. The server/service role is allowed to bypass RLS only for trusted server or worker code. API keys and YouTube refresh tokens are stored encrypted using `ENCRYPTION_KEY`.

At sign-up, the client creates `users` and default `settings` records. Supabase email confirmation should be configured so the user can establish a usable authenticated session during this flow.

## YouTube OAuth

Relevant code:

- `src/app/api/youtube/oauth/route.ts` starts the OAuth flow.
- `src/app/api/youtube/oauth/callback/route.ts` exchanges the code and stores an encrypted refresh token in `api_keys` with `provider = youtube`.
- `src/lib/youtube/client.ts` creates the OAuth client.
- `src/lib/youtube/uploader.ts` uploads final videos.

Required Google Cloud setup:

1. Enable **YouTube Data API v3**.
2. Create a **Web application** OAuth client, not a desktop client.
3. Add the exact redirect URI:
   `https://YOUR_DOMAIN/api/youtube/oauth/callback`
4. If the consent screen is in Testing, add the testing Google account under Test users.

Required deployment variables:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=https://YOUR_DOMAIN/api/youtube/oauth/callback
NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN
ENCRYPTION_KEY=at-least-32-characters-and-kept-stable
```

Never expose `GOOGLE_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, or `ENCRYPTION_KEY` through variables starting with `NEXT_PUBLIC_`.

## Environment Variables

Copy `.env.example` to `.env.local` for local development. Never commit `.env.local`.

Core variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
ENCRYPTION_KEY=
AI_PROVIDER=gemini
GOOGLE_GENERATIVE_AI_API_KEY=
STOCK_MEDIA_PROVIDER=pexels
PEXELS_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=
MAX_RETRIES=3
WORKER_MAX_JOBS=10
```

Optional provider variables: `GROQ_API_KEY`, `PIXABAY_API_KEY`, `DEFAULT_VOICE`, `TTS_CONCURRENCY`, `CRON_SECRET`, `GITHUB_TOKEN`, and `GITHUB_REPO`.

## Deployment

### Vercel

- Deploy the Next.js project.
- Set all production environment variables and redeploy after changes.
- In Supabase Auth URL Configuration, set the Vercel URL as Site URL and add it to redirect URLs.
- Vercel is not responsible for heavy stages.

### GitHub Actions

The worker requires all provider and Supabase secrets. `pipeline-worker.yml` runs the heavy worker periodically and can be run manually. `daily-cron.yml` runs daily maintenance and may trigger the worker.

GitHub only detects workflows at the root of the GitHub repository: `.github/workflows/*.yml`. If this `app` folder is a subdirectory of the repository, ensure the workflow directory is at the repository root, not merely at `app/.github/workflows`.

## Commands

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
npm run worker
npm run worker:daily
npm run cleanup
```

## Useful API Routes

```text
POST /api/projects
POST /api/jobs
POST /api/jobs/[id]/advance
POST /api/jobs/[id]/approve
GET  /api/logs?job_id=<job-id>
GET  /api/youtube/oauth
POST /api/youtube/upload
```

## Current Operational Notes

- `npm test` currently passes (25 tests).
- `npm run lint` passes with existing warnings.
- Production builds require valid Supabase public environment variables during static prerendering.
- The project currently uses `src/middleware.ts`; recent Next.js versions report the middleware-to-proxy migration as a deprecation warning.
- New/unverified YouTube API projects may upload only private videos until Google completes its required YouTube API compliance audit.

## Rules for Future Changes

1. Preserve RLS and never move service-role usage to browser code.
2. Do not hardcode or print secrets.
3. Keep heavy media work out of Vercel functions.
4. Keep the pipeline state names synchronized across the database enum, types, stage map, UI, and worker.
5. Add or update tests for pure logic changes, then run `npm test`, `npm run lint`, and `npm run build`.
6. For OAuth changes, test the exact production redirect URI and verify the callback still stores the encrypted `youtube` token.
