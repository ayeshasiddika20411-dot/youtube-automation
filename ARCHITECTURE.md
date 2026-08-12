# Architecture — AI Content Studio v1.0

## 1. Why a hybrid architecture?

Vercel's free tier has hard limits: ~10–60s serverless function timeout, no persistent disk, no pre-installed FFmpeg binary, and no long-running processes. FFmpeg rendering, large stock-media downloads, and TTS synthesis cannot reliably run inside a Vercel API route on the free plan.

So the system is split into two cooperating parts (still one repo, one Next.js codebase):

| Layer | Runs on | Responsible for |
|-------|---------|-----------------|
| **Web App (control plane)** | Vercel (Next.js API routes) | Auth, dashboard/UI, CRUD on Supabase, lightweight AI calls (script, SEO, scene planning — fast text calls), job creation, manual review/approve, YouTube OAuth handshake |
| **Worker (pipeline runner)** | GitHub Actions (scheduled + manually dispatchable) | Heavy stages: stock media download, Edge TTS voice synthesis, subtitle generation, FFmpeg video rendering, YouTube video upload |

Both share the same `src/lib/` service/repository code — the worker is just a Node script (`scripts/worker.ts`) that calls the identical pipeline functions the API routes use.

## 2. Technology decisions

| Concern | Choice | Why |
|---------|--------|-----|
| Stock media | Pexels + Pixabay | Free, royalty-free, key-based, via a common `StockMediaProvider` interface |
| AI providers | Gemini + Groq | `AIProvider` interface, selected via user Settings |
| Text-to-speech | msedge-tts | Pure Node/WebSocket implementation of Microsoft Edge TTS, no Python dependency, word-boundary events for accurate subtitle timing |
| Video | fluent-ffmpeg + ffmpeg-static | Local/dev; GitHub Actions `ubuntu-latest` runners already ship FFmpeg |
| YouTube | googleapis | OAuth2 offline access → refresh token stored encrypted per user; resumable upload |
| Toasts / skeletons / dark mode | sonner, Tailwind skeleton components, next-themes | Fast, polished UI |
| Testing | vitest | Unit tests on pure logic, no network calls |

## 3. Database (Supabase Postgres)

All tables use `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at`, `updated_at` (trigger), RLS enabled, and `user_id` FK where owned. See **[DATABASE.md](./DATABASE.md)** for the full schema.

## 4. Pipeline design

`content_jobs.status` exactly matches the spec's stage list:

```
pending → research → script → seo → scene_planning → stock_media
       → voice → subtitles → video_rendering → ready_for_review
       → upload → completed
```

Plus `failed` (after max retries).

### Stage modules
`src/lib/pipeline/stages/*.ts` — one module per stage, each exporting `(job) => Promise<StageResult>`.

### Orchestrator
`src/lib/pipeline/orchestrator.ts`:
- Runs the next stage for a job, wrapped in try/catch.
- On failure, increments `retry_count` (max 3, exponential backoff).
- Logs to `system_logs`; sets `failed` after the 3rd failure, otherwise leaves the job retryable.
- `ready_for_review` **pauses the pipeline** — the job sits until a user clicks **Approve** in the UI, which triggers the upload stage.

### Light vs heavy stages
- **Light stages** (research, script, seo, scene_planning) run in API routes via `/api/jobs/[id]/advance` so the dashboard can show live progress without waiting for a cron tick.
- **Heavy stages** (stock_media, voice, subtitles, video_rendering, upload) run in the worker (`scripts/worker.ts`), which polls jobs and advances them.

## 5. Security

- **RLS**: every query is scoped to `auth.uid()` via policies.
- **Encrypted at rest**: API keys (AI, stock media, YouTube tokens) are encrypted with `ENCRYPTION_KEY` (AES-256-GCM) before being stored in `api_keys`.
- **Service role**: only server-side code uses the service-role client (bypasses RLS); browser always uses the anon key + user session.
- **Secrets**: read from environment variables; never hardcoded, never exposed to the client.

## 6. Data flow (end to end)

1. User creates a **project** and a **content_job** (topic).
2. API route advances the job through light stages (research → script → seo → scene_planning).
3. Job reaches `scene_planning`; heavy stages are queued for the worker.
4. GitHub Actions worker (or `npm run worker` locally) polls and runs: stock_media → voice → subtitles → video_rendering.
5. Job reaches `ready_for_review` and **pauses**.
6. User reviews and clicks **Approve** in the dashboard.
7. Upload stage runs (worker or API-triggered) → video published to YouTube → job `completed`.
8. The daily cron handles retries, cleanup, and reporting.
