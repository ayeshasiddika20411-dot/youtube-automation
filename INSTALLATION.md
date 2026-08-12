# Installation Guide — AI Content Studio v1.0

## Prerequisites

- **Node.js** v20+ (v24 recommended) and **npm** v9+.
- A **Supabase** project (free tier). Sign up at <https://supabase.com>.
- API keys for whichever providers you plan to use:
  - **Gemini** — <https://aistudio.google.com/app/apikey>
  - **Groq** (optional fallback) — <https://console.groq.com/keys>
  - **Pexels** — <https://www.pexels.com/api/>
  - **Pixabay** — <https://pixabay.com/api/docs/>
  - **Google Cloud / YouTube Data API v3** — create OAuth 2.0 credentials (Desktop app type) at <https://console.cloud.google.com/apis/credentials>

## 1. Clone & install

```bash
# from inside your project directory
npm install
```

## 2. Configure environment

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | From Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | From Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-only. **Never** expose to client |
| `NEXT_PUBLIC_APP_URL` | ✅ | e.g. `http://localhost:3000` |
| `ENCRYPTION_KEY` | ✅ | 32+ char secret. `openssl rand -base64 32` |
| `AI_PROVIDER` | | `gemini` or `groq` (default `gemini`) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | ✅ (if gemini) | Gemini key |
| `GROQ_API_KEY` | ✅ (if groq) | Groq key |
| `STOCK_MEDIA_PROVIDER` | | `pexels` or `pixabay` |
| `PEXELS_API_KEY` | ✅ (if pexels) | |
| `PIXABAY_API_KEY` | ✅ (if pixabay) | |
| `DEFAULT_VOICE` | | e.g. `en-US-JennyNeural` |
| `GOOGLE_CLIENT_ID` | ✅ (for YouTube) | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ (for YouTube) | |
| `YOUTUBE_REDIRECT_URI` | ✅ | `http://localhost:3000/api/youtube/oauth/callback` |
| `CRON_SECRET` | ✅ (prod) | Protects `/api/cron/daily` |
| `GITHUB_TOKEN` / `GITHUB_REPO` | ✅ (prod) | For triggering the worker from cron |

## 3. Set up the database

1. Open your Supabase project → **SQL Editor**.
2. Run **`supabase/migrations/0001_init.sql`** (creates all tables, RLS, indexes, triggers).
3. Run **`supabase/seed.sql`** (optional demo seed data).

> The migration must be applied before the app will function.

## 4. Run the app

```bash
npm run dev
```

Open <http://localhost:3000>.

## 5. Run the worker locally (optional)

To test the heavy pipeline stages without GitHub Actions:

```bash
npm run worker        # process heavy stages
npm run worker:daily  # run the daily cron manually
npm run cleanup       # clean temp files
```

## 6. Run tests

```bash
npm run test
```

## 7. YouTube OAuth setup details

1. In Google Cloud Console, create a **Desktop app** OAuth client.
2. Add `http://localhost:3000/api/youtube/oauth/callback` (dev) or your production URL as an **Authorized redirect URI**.
3. Enable the **YouTube Data API v3**.
4. Put the client ID/secret in `.env.local`.

When a user connects YouTube from **Settings → API Keys → Connect YouTube**, they'll be redirected to Google, approve, and the resulting refresh token is stored **encrypted** in the `api_keys` table.
