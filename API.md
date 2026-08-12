# API Reference — AI Content Studio

All routes are Next.js App Router route handlers under `src/app/api`. They return JSON. Authentication is via Supabase session cookies; most routes require an authenticated user.

---

## Auth

### `POST /api/auth/logout`
Sign out the current user.
- **Response**: `200 { ok: true }`

### `GET /api/auth/callback`
Supabase OAuth/email confirmation callback. Exchange `code` for a session and set cookies, then redirect to `/dashboard`.

---

## Projects

### `GET /api/projects`
List the current user's projects.
- **Response**: `200` array of projects.

### `POST /api/projects`
Create a project.
- **Body**: `{ name, description?, niche?, status? }`
- **Response**: `201` created project.

---

## Jobs

### `GET /api/jobs`
List jobs (optionally filtered by `project_id`).
- **Query**: `?project_id=...`
- **Response**: `200` array of jobs.

### `POST /api/jobs`
Create a content job.
- **Body**: `{ project_id, topic }`
- **Response**: `201` created job.

### `POST /api/jobs/[id]/advance`
Run the next **light** pipeline stage for a job (research → script → seo → scene_planning). Heavy stages are handled by the worker.
- **Response**: `200 { job, stage, advanced }`

### `POST /api/jobs/[id]/approve`
Manual review gate. Approves a job sitting at `ready_for_review` and triggers the upload stage.
- **Response**: `200 { job }`

---

## Settings

### `GET /api/settings`
Get the current user's settings.
- **Response**: `200` settings object.

### `PUT /api/settings`
Update settings.
- **Body**: Settings fields to update.
- **Response**: `200` updated settings.

---

## API Keys

### `GET /api/api-keys`
List the current user's API keys — **only metadata** (provider, created_at); never the decrypted secret.
- **Response**: `200` array of `{ provider, created_at }`.

### `POST /api/api-keys`
Save an API key (encrypted before storage).
- **Body**: `{ provider, key }`
- **Response**: `201 { provider, created_at }`.

---

## Logs

### `GET /api/logs`
List system logs (optionally filtered by `job_id`).
- **Query**: `?job_id=...`
- **Response**: `200` array of logs.

---

## YouTube OAuth

### `GET /api/youtube/oauth`
Start the YouTube OAuth flow — redirects to Google.
- **Response**: `302` redirect to Google's consent screen.

### `GET /api/youtube/oauth/callback`
OAuth callback. Exchange code for tokens, store the refresh token **encrypted** in `api_keys`, redirect to `/dashboard/settings/api-keys`.
- **Query**: `?code=...&state=...`

### `POST /api/youtube/upload`
Trigger a YouTube upload for a job (used by the worker/approve flow).
- **Body**: `{ jobId }`
- **Response**: `200` upload result.

---

## Cron

### `POST /api/cron/daily`
Daily scheduled job. Protected by `CRON_SECRET` (sent as `Authorization: Bearer <secret>`). Runs research/generate/queue/retry/cleanup/report tasks.
- **Response**: `200 { results }`.

---

## Conventions

- All responses use `{ data }` or `{ error }` shapes.
- Errors return appropriate HTTP status codes: `400` bad request, `401` unauthenticated, `403` forbidden, `404` not found, `500` server error.
- Jobs are scoped to the authenticated user via RLS; a missing/foreign `user_id` results in `403`.
