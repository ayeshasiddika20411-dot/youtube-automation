# Database Schema — AI Content Studio

All tables live in a Supabase Postgres database. Every table uses:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` (auto-updated by a trigger)
- **Row Level Security (RLS) enabled**, with policies scoping to `auth.uid()`.

> The authoritative DDL is in **`supabase/migrations/0001_init.sql`**. This document is a reference.

---

## Tables

### `users`
Profile extension mirroring `auth.users`.
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | references `auth.users(id)` |
| display_name | TEXT | |
| avatar_url | TEXT | |
| default_language | TEXT | |
| timezone | TEXT | |

### `settings`
Per-user system preferences.
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| ai_provider | TEXT | `gemini` \| `groq` |
| voice | TEXT | default TTS voice |
| default_language | TEXT | |
| video_duration | INT | target seconds |
| upload_defaults | JSONB | default title/desc/tags |
| publishing_preferences | JSONB | |

### `api_keys`
Encrypted third-party credentials. Never exposed to the client after write.
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| provider | TEXT | e.g. `pexels`, `groq`, `youtube` |
| encrypted_key | TEXT | AES-256-GCM |
| created_at | TIMESTAMPTZ | |

### `projects`
Top-level grouping for jobs.
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| name | TEXT | |
| description | TEXT | |
| niche | TEXT | |
| status | TEXT | |

### `content_jobs`
The core pipeline record.
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_id | UUID FK | |
| user_id | UUID FK | |
| topic | TEXT | |
| status | TEXT | matches pipeline stages |
| retry_count | INT | default 0 |
| last_error | TEXT | |
| stage_started_at | TIMESTAMPTZ | |

### `scripts`
Generated script content.
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| job_id | UUID FK | |
| hook | TEXT | |
| introduction | TEXT | |
| main_content | TEXT | |
| ending | TEXT | |
| cta | TEXT | |
| language | TEXT | |
| style | TEXT | |
| length_seconds | INT | |

### `seo_metadata`
SEO payload.
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| job_id | UUID FK | |
| title | TEXT | |
| description | TEXT | |
| hashtags | TEXT[] | |
| keywords | TEXT[] | |
| tags | TEXT[] | |
| thumbnail_title | TEXT | |
| pinned_comment | TEXT | |

### `scenes`
One row per scene in the video.
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| job_id | UUID FK | |
| scene_index | INT | |
| narration | TEXT | |
| search_keywords | TEXT[] | |
| duration | INT | seconds |
| transition | TEXT | |

### `stock_assets`
Fetched/downloaded media per scene.
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| job_id | UUID FK | |
| scene_id | UUID FK | |
| provider | TEXT | |
| source_url | TEXT | |
| local_path | TEXT | |
| license_info | TEXT | |
| fallback_used | BOOLEAN | |

### `voice_files`
TTS output.
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| job_id | UUID FK | |
| storage_path | TEXT | |
| voice_name | TEXT | |
| duration | INT | |
| format | TEXT | |

### `subtitle_files`
Generated subtitles.
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| job_id | UUID FK | |
| storage_path | TEXT | |
| format | TEXT | e.g. SRT |
| has_word_timestamps | BOOLEAN | |

### `videos`
Rendered output video.
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| job_id | UUID FK | |
| storage_path | TEXT | |
| resolution | TEXT | |
| duration | INT | |
| thumbnail metadata | JSONB | |
| status | TEXT | |

### `youtube_uploads`
Upload results.
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| job_id | UUID FK | |
| video_id | TEXT | |
| url | TEXT | |
| publish_status | TEXT | |
| title | TEXT | |
| visibility | TEXT | |
| playlist_id | TEXT | |
| category | TEXT | |
| language | TEXT | |
| uploaded_at | TIMESTAMPTZ | |

### `cron_logs`
Daily cron run records.
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| run_id | TEXT | |
| task_name | TEXT | |
| started_at | TIMESTAMPTZ | |
| finished_at | TIMESTAMPTZ | |
| status | TEXT | |
| summary | JSONB | |

### `system_logs`
Operational logging.
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| job_id | UUID (nullable) FK | |
| level | TEXT | `info` \| `warn` \| `error` |
| message | TEXT | |
| context | JSONB | |
| duration_ms | INT | |
| created_at | TIMESTAMPTZ | |

---

## Indexes

- `content_jobs(status)`
- `content_jobs(user_id)`
- `system_logs(job_id)`
- `system_logs(created_at)`
- `youtube_uploads(job_id)`

## Triggers

- `set_updated_at()` — bumps `updated_at` on any row update (applied to all tables that have `updated_at`).

## Row Level Security

RLS is enabled on all tables. Policies grant `SELECT`/`INSERT`/`UPDATE`/`DELETE` only where `user_id = auth.uid()`. For tables without a direct `user_id`, RLS policies are scoped via the owning relation (e.g. `scenes` via `content_jobs.user_id`).
