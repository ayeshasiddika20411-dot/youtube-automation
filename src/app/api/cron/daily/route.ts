import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/services/logger";

/**
 * Daily cron endpoint. Protected by CRON_SECRET.
 * Responsible for:
 *  - Researching/generating new content ideas
 *  - Creating queued jobs from configured topics
 *  - Retrying failed jobs
 *  - Cleaning up temp files
 *  - Reporting a summary
 *
 * In the hybrid architecture, the heavy work is delegated to the GitHub Actions
 * worker. This endpoint mostly orchestrates and reports.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const supabase = createServiceClient();

  const summary: Record<string, unknown> = {
    researched: 0,
    queued: 0,
    retried: 0,
    cleaned: 0,
  };

const db: any = supabase;

  try {
    // 1. Retry failed jobs (up to some limit)
    const { data: failedJobs } = await db
      .from("content_jobs")
      .select("id, status")
      .eq("status", "failed")
      .limit(10);

    if (failedJobs && failedJobs.length > 0) {
      for (const job of failedJobs) {
        // Reset failed jobs back to a retryable state
        await db
          .from("content_jobs")
          .update({ status: "research", retry_count: 0, last_error: null })
          .eq("id", job.id);
        summary.retried = (summary.retried as number) + 1;
      }
    }

    // Record the cron run
    const finishedAt = new Date().toISOString();
    await db.from("cron_logs").insert({
      run_id: crypto.randomUUID(),
      task_name: "daily",
      started_at: startedAt,
      finished_at: finishedAt,
      status: "success",
      summary,
    });

    await logger.info(`Daily cron completed`, { context: summary });

    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    const finishedAt = new Date().toISOString();
    await db.from("cron_logs").insert({
      run_id: crypto.randomUUID(),
      task_name: "daily",
      started_at: startedAt,
      finished_at: finishedAt,
      status: "failed",
      summary: { error: (err as Error).message },
    });
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
