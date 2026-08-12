# Folder Structure — AI Content Studio

```
.
├── .github/workflows/          # GitHub Actions
│   ├── daily-cron.yml          #   scheduled research/generate/queue/retry/cleanup/report
│   └── pipeline-worker.yml     #   heavy-stage worker (scheduled + manual dispatch)
├── scripts/                    # Standalone Node scripts
│   ├── worker.ts               #   heavy-stage pipeline runner (reuses lib/)
│   └── cleanupTemp.ts          #   temp file cleanup
├── supabase/
│   ├── migrations/
│   │   └── 0001_init.sql       #   all tables + RLS + indexes + triggers
│   └── seed.sql                #   optional demo data
├── src/
│   ├── app/
│   │   ├── (auth)/             # login, register, forgot-password
│   │   ├── (dashboard)/        # dashboard, projects, jobs, queue, videos,
│   │   │                       #   analytics, settings, settings/api-keys, logs, profile
│   │   ├── api/                # route handlers
│   │   │   ├── auth/           #   logout, callback
│   │   │   ├── projects/       #   CRUD
│   │   │   ├── jobs/           #   create, advance, approve
│   │   │   ├── settings/       #   get/update
│   │   │   ├── api-keys/       #   save/list (encrypted)
│   │   │   ├── logs/           #   list
│   │   │   ├── youtube/        #   oauth, oauth/callback, upload
│   │   │   └── cron/daily/     #   daily cron
│   │   ├── error.tsx           # global error boundary
│   │   ├── not-found.tsx
│   │   ├── loading.tsx
│   │   ├── layout.tsx          # root layout
│   │   └── page.tsx            # landing/redirect
│   ├── components/
│   │   ├── ui/                 # button, card, badge, skeleton
│   │   ├── layout/             # sidebar, mobile-nav, theme-toggle
│   │   ├── dashboard/          # create-job-form, create-project-form
│   │   ├── jobs/               # trigger-advance
│   │   └── settings/           # settings-form, api-key-form, youtube-connect
│   ├── hooks/                  # useAuth
│   ├── lib/
│   │   ├── ai/                 # provider.ts, gemini.ts, groq.ts, index.ts
│   │   ├── stockMedia/         # provider.ts, pexels.ts, pixabay.ts, index.ts
│   │   ├── voice/              # edgeTts.ts
│   │   ├── subtitles/          # srtGenerator.ts
│   │   ├── video/              # ffmpegRenderer.ts
│   │   ├── youtube/            # client.ts, uploader.ts
│   │   ├── pipeline/           # types.ts, orchestrator.ts, index.ts
│   │   │   └── stages/         #   research, script, seo, scene_planning,
│   │   │                       #   stock_media, voice, subtitles, video_rendering, upload
│   │   ├── repositories/       # jobs, projects, settings, apiKeys
│   │   ├── services/           # script, seo, scenePlanner, logger
│   │   ├── supabase/           # client.ts (browser), server.ts (server/service)
│   │   └── utils/              # cn.ts, retry.ts, encryption.ts
│   ├── types/                  # db.ts, database.ts, pipeline.ts
│   └── middleware.ts           # protected route handling
├── tests/                      # Vitest unit tests
│   ├── srtGenerator.test.ts
│   ├── retry.test.ts
│   ├── scenePlanner.test.ts
│   └── seo.test.ts
├── .env.example
├── .eslintrc.json / eslint.config.mjs
├── .prettierrc
├── next.config.ts
├── tsconfig.json
├── vitest.config.mts
├── TODO.md
└── *.md                        # README, INSTALLATION, DEPLOYMENT, ARCHITECTURE,
                                # DATABASE, API, FOLDER_STRUCTURE, TROUBLESHOOTING
