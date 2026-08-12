import type { Database } from "@/types/database";
import type { JobStatus, ContentJob } from "@/types/db";
import { nextStage } from "@/types/pipeline";

type QueryClient = Pick<Database["public"], never> & {
  from: <T extends keyof Database["public"]["Tables"]>(
    table: T
  ) => any;
};

/**
 * Repository for content_jobs and related pipeline tables.
 * Accepts a Supabase client (server-scoped or service-role) so the same code
 * works from API routes (RLS) and the worker (service role).
 */
export class JobsRepository {
  constructor(private client: QueryClient) {}

  async getJobById(jobId: string): Promise<ContentJob | null> {
    const { data, error } = await this.client
      .from("content_jobs")
      .select("*")
      .eq("id", jobId)
      .single();
    if (error) return null;
    return (data as unknown as ContentJob) ?? null;
  }

  async getJobByUser(jobId: string, userId: string): Promise<ContentJob | null> {
    const { data, error } = await this.client
      .from("content_jobs")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", userId)
      .single();
    if (error) return null;
    return (data as unknown as ContentJob) ?? null;
  }

  async listJobs(
    opts: { userId?: string; status?: JobStatus; projectId?: string; limit?: number } = {}
  ): Promise<ContentJob[]> {
    let query = this.client.from("content_jobs").select("*");
    if (opts.userId) query = query.eq("user_id", opts.userId);
    if (opts.status) query = query.eq("status", opts.status);
    if (opts.projectId) query = query.eq("project_id", opts.projectId);
    if (opts.limit) query = query.limit(opts.limit);
    query = query.order("created_at", { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    return (data as unknown as ContentJob[]) ?? [];
  }

  async createJob(input: {
    userId: string;
    projectId?: string | null;
    topic: string;
    status?: JobStatus;
  }): Promise<ContentJob> {
    const { data, error } = await this.client
      .from("content_jobs")
      .insert({
        user_id: input.userId,
        project_id: input.projectId ?? null,
        topic: input.topic,
        status: input.status ?? "pending",
        retry_count: 0,
      })
      .select()
      .single();
    if (error) throw error;
    return data as unknown as ContentJob;
  }

  async updateStatus(jobId: string, status: JobStatus, errorMsg: string | null = null): Promise<void> {
    const patch: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === "failed") {
      patch.last_error = errorMsg;
    } else if (errorMsg == null) {
      patch.last_error = null;
    }
    if (status !== "failed") patch.stage_started_at = new Date().toISOString();
    const { error } = await this.client.from("content_jobs").update(patch).eq("id", jobId);
    if (error) throw error;
  }

  /** Advance a job to the next stage in the pipeline */
  async advanceJob(jobId: string, currentStatus: JobStatus): Promise<JobStatus | null> {
    const next = nextStage(currentStatus);
    if (!next) return null;
    await this.updateStatus(jobId, next);
    return next;
  }

  async incrementRetry(jobId: string, errorMsg: string): Promise<number> {
    const job = await this.getJobById(jobId);
    const retryCount = (job?.retry_count ?? 0) + 1;
    const { error } = await this.client
      .from("content_jobs")
      .update({ retry_count: retryCount, last_error: errorMsg, updated_at: new Date().toISOString() })
      .eq("id", jobId);
    if (error) throw error;
    return retryCount;
  }

  async resetRetry(jobId: string): Promise<void> {
    const { error } = await this.client
      .from("content_jobs")
      .update({ retry_count: 0, last_error: null, updated_at: new Date().toISOString() })
      .eq("id", jobId);
    if (error) throw error;
  }

  /** Find jobs stuck in a heavy stage that need worker attention */
  async findHeavyJobsReady(opts: { limit?: number; stages?: JobStatus[] } = {}): Promise<ContentJob[]> {
    const limit = opts.limit ?? 10;
    const { data, error } = await this.client
      .from("content_jobs")
      .select("*")
      .in("status", opts.stages ?? ["stock_media", "voice", "subtitles", "video_rendering", "upload"])
      .limit(limit);
    if (error) throw error;
    return (data as unknown as ContentJob[]) ?? [];
  }
}

// ---- Related table helpers (scripts, seo, scenes, assets, voice, subs, videos, uploads) ----

export async function upsertScript(client: QueryClient, row: {
  job_id: string; hook: string; introduction: string;
  main_content: string; ending: string; cta: string;
  language: string; style: string; length_seconds: number;
}): Promise<void> {
  const { error } = await client.from("scripts").upsert(row as never).eq("job_id", row.job_id);
  if (error) throw error;
}

export async function getScript(client: QueryClient, jobId: string) {
  const { data, error } = await client.from("scripts").select("*").eq("job_id", jobId).single();
  if (error) return null;
  return data;
}

export async function upsertSeo(client: QueryClient, row: {
  job_id: string; title: string; description: string; hashtags: string[];
  keywords: string[]; tags: string[]; thumbnail_title: string; pinned_comment: string;
}): Promise<void> {
  const { error } = await client.from("seo_metadata").upsert(row as never).eq("job_id", row.job_id);
  if (error) throw error;
}

export async function insertScenes(client: QueryClient, rows: {
  job_id: string; scene_index: number; narration: string; search_keywords: string[];
  duration: number; transition: string;
}[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await client.from("scenes").insert(rows as never);
  if (error) throw error;
}

export async function getScenes(client: QueryClient, jobId: string) {
  const { data, error } = await client.from("scenes").select("*").eq("job_id", jobId).order("scene_index", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function insertStockAsset(client: QueryClient, row: {
  job_id: string; scene_id: string | null; provider: string; source_url: string;
  local_path: string; license_info: string; fallback_used: boolean;
}): Promise<void> {
  const { error } = await client.from("stock_assets").insert(row as never);
  if (error) throw error;
}

export async function insertVoiceFile(client: QueryClient, row: {
  job_id: string; storage_path: string; voice_name: string; duration: number; format: string;
}): Promise<void> {
  const { error } = await client.from("voice_files").insert(row as never);
  if (error) throw error;
}

export async function insertSubtitleFile(client: QueryClient, row: {
  job_id: string; storage_path: string; format: string; has_word_timestamps: boolean;
}): Promise<void> {
  const { error } = await client.from("subtitle_files").insert(row as never);
  if (error) throw error;
}

export async function upsertVideo(client: QueryClient, row: {
  job_id: string; storage_path: string; resolution: string; duration: number; status: string;
}) {
  const { data, error } = await client.from("videos").upsert(row as never).select().single();
  if (error) throw error;
  return data;
}

export async function upsertYoutubeUpload(client: QueryClient, row: {
  job_id: string; user_id: string; video_id: string | null; url: string | null;
  publish_status: string; title: string | null; visibility: string; playlist_id: string | null;
  category: string | null; language: string | null; uploaded_at: string | null;
}) {
  const { data, error } = await client.from("youtube_uploads").upsert(row as never).select().single();
  if (error) throw error;
  return data;
}
