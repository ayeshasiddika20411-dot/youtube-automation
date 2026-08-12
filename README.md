# AI Content Studio v1.0

A **zero-budget, fully-automated YouTube content pipeline**. Generate faceless videos end-to-end: research → AI script → SEO metadata → scene planning → stock media → TTS voiceover → subtitles → FFmpeg rendering → YouTube upload — with a manual review gate before publishing.

This is a **hybrid architecture** split across two free tiers:

| Layer | Runs on | Responsible for |
|-------|---------|-----------------|
| **Web App (control plane)** | Vercel (Next.js API routes) | Auth, dashboard/UI, CRUD on Supabase, lightweight AI calls (script, SEO, scene planning), job creation, manual review/approve, YouTube OAuth handshake |
| **Worker (pipeline runner)** | GitHub Actions (scheduled + manually dispatchable) | Heavy stages: stock media download, Edge TTS voice synthesis, subtitle generation, FFmpeg video rendering, YouTube video upload |

Both share the same `src/lib/` service/repository code — the worker is a Node script (`scripts/worker.ts`) that calls the identical pipeline functions the API routes use.

---

## Features

- **Full pipeline** matching the spec flow: `pending → research → script → seo → scene_planning → stock_media → voice → subtitles → video_rendering → ready_for_review → upload → completed / failed`.
- **Pluggable providers** via interface/adapter pattern:
  - AI: **Gemini** (Google Generative AI) + **Groq** (OpenAI-compatible) fallback.
  - Stock media: **Pexels** + **Pixabay** (free, royalty-free).
  - TTS: **msedge-tts** (pure Node, word-boundary timestamps for accurate subtitles).
  - Video: **fluent-ffmpeg** + **ffmpeg-static** (local/dev) or GitHub Actions runner FFmpeg.
  - YouTube: **googleapis** OAuth2 offline access + resumable upload.
- **Supabase** backend: Postgres schema with RLS, UUIDs, triggers, indexes; Supabase Auth.
- **Manual review gate**: jobs pause at `ready_for_review` until you click **Approve**.
- **Retry/backoff** orchestration (max 3 retries, exponential backoff).
- **Dark mode** (next-themes), **toasts** (sonner), **skeleton loaders**, error/loading states.
- **GitHub Actions**: daily cron (research/generate/queue/retry/cleanup/report) + heavy-stage worker.
- **Vitest** unit tests for pure logic (SRT generation, retry/backoff, scene splitting, SEO formatting).

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# ... fill in Supabase, AI, stock media, YouTube credentials ...

# 3. Run migrations against your Supabase project (SQL editor)
#      supabase/migrations/0001_init.sql
#      supabase/seed.sql

# 4. Start the dev server
npm run dev
```

See **[INSTALLATION.md](./INSTALLATION.md)** for full setup and **[ARCHITECTURE.md](./ARCHITECTURE.md)** for the system design.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run test` | Run Vitest unit tests |
| `npm run worker` | Run the heavy-stage worker locally |
| `npm run worker:daily` | Run the daily cron job locally |
| `npm run cleanup` | Clean up stale temp files |

---

## Documentation

- [INSTALLATION.md](./INSTALLATION.md) — environment setup, credentials, local run
- [DEPLOYMENT.md](./DEPLOYMENT.md) — deploy to Vercel + configure GitHub Actions + Supabase
- [ARCHITECTURE.md](./ARCHITECTURE.md) — hybrid architecture & pipeline design
- [DATABASE.md](./DATABASE.md) — full schema reference
- [API.md](./API.md) — all REST API endpoints
- [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md) — codebase layout
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — common issues & fixes

---

## Important Caveats

- **You must supply real credentials**: Supabase, Gemini/Groq, Pexels/Pixabay, and Google/YouTube OAuth keys. They are read from environment variables — never hardcoded and never exposed to the client.
- **Live end-to-end testing** (real video render, real YouTube upload) requires deploying to Vercel + GitHub Actions and providing real keys. Everything buildable locally (lint, build, unit tests) is validated.
- **FFmpeg cannot run inside a Vercel serverless function** on the free tier, which is exactly why the heavy pipeline runs on GitHub Actions instead.

---

## License

Private / proprietary. Built for the AI Content Studio project.
