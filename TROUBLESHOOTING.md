# Troubleshooting — AI Content Studio

## Build / TypeScript

**`Object literal may only specify known properties` (NextConfig)**
- Some options (e.g. `eslint`, `experimental` in old versions) aren't valid in your Next version. Remove the invalid keys.

**`npm run build` fails on lint**
- Run `npm run lint` and fix errors, or remove `eslint.ignoreDuringBuilds` (not supported in Next 16).

**Path alias `@/*` not resolving in tests**
- Use `.mts` Vite config (as provided) with `resolve: { tsconfigPaths: true }`. The `tests/` directory imports via `@/...`.

## Supabase / Auth

**403 on queries / RLS blocks**
- Ensure the migration `0001_init.sql` was applied and RLS policies exist. The browser client uses the **anon key + session**; server-side uses the **service role key**.

**"User not found" / session not set**
- Make sure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set. For cookies, the `@supabase/ssr` client must be used in the layout and middleware.

**Redirect loop on `/login`**
- The middleware protects dashboard routes. If your session cookie isn't being set, check the auth callback route and the `site_url` in Supabase Auth settings.

## AI Providers

**Gemini returns 400 / empty**
- Check `GOOGLE_GENERATIVE_AI_API_KEY` is set and valid. Some models require a `systemInstruction`; the provider sends it as a system message.

**Groq not used**
- Ensure `AI_PROVIDER=groq` and `GROQ_API_KEY` are set. Default is `gemini`.

## Stock Media

**No results / slow**
- Check `PEXELS_API_KEY` or `PIXABAY_API_KEY`. Free tiers have rate limits; the provider has a fallback search with broader terms.

## TTS (msedge-tts)

**No audio produced**
- msedge-tts requires network access. If running in GitHub Actions, ensure outbound WebSocket (port 443) is allowed. Check `DEFAULT_VOICE` is a valid Edge voice name.

## Video (FFmpeg)

**ffmpeg not found**
- `fluent-ffmpeg` needs a binary. Locally, `ffmpeg-static` provides one. On GitHub Actions `ubuntu-latest`, FFmpeg is pre-installed. In code, set the ffmpeg path from `ffmpeg-static` when available.

**Render times out**
- This is why rendering runs on the worker, not a Vercel function. Run heavy stages via `npm run worker` or GitHub Actions.

## YouTube

**OAuth redirect URI mismatch**
- The `YOUTUBE_REDIRECT_URI` must exactly match an authorized redirect URI in your Google OAuth client.

**Upload fails / quota**
- Verify the refresh token is stored (encrypted) in `api_keys` and the YouTube Data API v3 is enabled. Check quota usage.

## Cron / Worker

**Cron 401**
- Send `Authorization: Bearer <CRON_SECRET>` to `/api/cron/daily`.

**Worker not picking up jobs**
- Ensure jobs are in a heavy stage (`stock_media`, `voice`, `subtitles`, `video_rendering`, `upload`) and that `SUPABASE_SERVICE_ROLE_KEY` is set in the worker environment.

## Tests

**`ESM syntax in a file loaded as CommonJS`**
- Use the `.mts` vitest config (already provided) or set `"type": "module"`.

**Mock not applying**
- In Vitest, `vi.mock` is hoisted. Keep the mock factory self-contained (no external variable references unless via `vi.hoisted`).

---

Still stuck? Check the `system_logs` table for stage errors and the `TROUBLESHOOTING`/`DATABASE` docs for schema context.
