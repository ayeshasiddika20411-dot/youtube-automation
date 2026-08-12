/**
 * Pipeline Worker
 * -----------------
 * Runs outside the Next.js runtime (local dev or GitHub Actions).
 *
 * Modes:
 *   --mode=worker   Polls jobs stuck in HEAVY stages and advances them
 *                   (stock_media, voice, subtitles, video_rendering, upload).
 *   --mode=daily    Daily maintenance: mark stale running jobs for retry,
 *                   run light stages that were queued by the cron, etc.
 *
 * This script intentionally builds its own Supabase admin client instead of
 * importing src/lib/supabase/server (which pulls in next/headers) so it can
 * run as a plain Node process via `tsx`.
 */
import { createClient as createAdminClient } from "@supabase/supabase-js";

console.log(`[worker] PID=${process.pid} at ${new Date().toISOString()}`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "[worker] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const client = createAdminClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const HEAVY_STAGES = [
  "stock_media",
  "voice",
  "subtitles",
  "video_rendering",
  "upload",
];

const MAX_RETRIES = Number(process.env.MAX_RETRIES ?? 3);
const MAX_JOBS = Number(process.env.WORKER_MAX_JOBS ?? 10);

interface JobRow {
  id: string;
  status: string;
  retry_count: number;
  last_error: string | null;
  topic: string;
  user_id: string;
  project_id: string | null;
}

async function log(level: string, message: string, jobId: string | null = null) {
  const entry = { job_id: jobId, level, message };
  console[level === "error" ? "error" : "log"](`[${level}]`, message);
  try {
    await client.from("system_logs").insert(entry as never);
  } catch (err) {
    console.error("[worker] failed to persist log:", err);
  }
}

async function fetchHeavyJobs(): Promise<JobRow[]> {
  const { data, error } = await client
    .from("content_jobs")
    .select("id, status, retry_count, last_error, topic, user_id, project_id")
    .in("status", HEAVY_STAGES)
    .order("created_at", { ascending: true })
    .limit(MAX_JOBS);
  if (error) throw error;
  return (data as unknown as JobRow[]) ?? [];
}

/** Invoke a merged heavy stage by calling the orchestrator-compatible runNextStage. */
async function runMergedStage(jobId: string): Promise<{
  advanced: boolean;
  failed?: boolean;
}> {
  // Import pipeline lazily so the heavy dependencies (msedge-tts, ffmpeg)
  // only load in worker mode and not in daily mode.
  const { runNextStage } = await import("@/lib/pipeline");
  return (await runNextStage(jobId, {
    client,
  })) as { advanced: boolean; failed?: boolean };
}

async function processHeavyJobs(): Promise<number> {
  const jobs = await fetchHeavyJobs();
  console.log(`[worker] found ${jobs.length} heavy jobs ready`);
  let processed = 0;

  for (const job of jobs) {
    try {
      const result = await runMergedStage(job.id);
      processed++;
      if (result.failed) {
        await log("error", `Job ${job.id} failed after ${MAX_RETRIES} retries`, job.id);
      } else if (result.advanced) {
        await log("info", `Worker advanced job ${job.id}`, job.id);
      } else {
        await log("warn", `Job ${job.id} did not advance`, job.id);
      }
    } catch (err) {
      await log("error", `Job ${job.id} threw: ${(err as Error).message}`, job.id);
    }
  }
  return processed;
}

async function runDaily() {
  console.log("[worker] running daily maintenance");
  // Reset jobs left in a running/processing state from a prior interrupted run.
  const { error } = await client
    .from("content_jobs")
    .update({ updated_at: new Date().toISOString() })
    .in("status", HEAVY_STAGES);
  if (error) console.error("[worker] daily cleanup failed:", error.message);
}

async function main() {
  const mode = (process.argv.find((a) => a.startsWith("--mode=")) ?? "--mode=worker")
    .split("=")[1];
  try {
    if (mode === "daily") {
      await runDaily();
      // Also process any heavy jobs so a single cron run can try to make progress.
      const processed = await processHeavyJobs();
      await log("info", `Daily run complete. Processed ${processed} heavy jobs.`);
    } else {
      const processed = await processHeavyJobs();
      await log("info", `Worker run complete. Processed ${processed} jobs.`);
    }
  } catch (err) {
    console.error("[worker] fatal:", err);
    process.exitCode = 1;
  }
}

main();

