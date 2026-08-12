import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { JobsRepository } from "@/lib/repositories/jobsRepository";
import { logger } from "@/lib/services/logger";

/**
 * Trigger the upload stage for a job. In the hybrid architecture, the actual
 * upload runs in the GitHub Actions worker. This endpoint ensures the job is
 * in the upload state (or sets it) and notifies the worker via a GitHub
 * Actions dispatch.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const jobId = body?.jobId;
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const repo = new JobsRepository(supabase);
  const job = await repo.getJobByUser(jobId, user.id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Job must be approved first (ready_for_review → upload via approve)
  if (job.status !== "upload") {
    return NextResponse.json(
      {
        error: `Job must be in "upload" stage to trigger upload (current: ${job.status}). Approve it first.`,
      },
      { status: 409 }
    );
  }

  // Optionally dispatch a GitHub Actions workflow to run the worker
  const ghToken = process.env.GITHUB_TOKEN;
  const repoName = process.env.GITHUB_REPO;
  if (ghToken && repoName) {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${repoName}/actions/workflows/pipeline-worker.yml/dispatches`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ghToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ref: "main",
            inputs: { jobId },
          }),
        }
      );
      if (!res.ok) {
        await logger.warn(`GitHub dispatch failed for job ${jobId}: ${res.status}`, { jobId });
      }
    } catch (err) {
      await logger.warn(`GitHub dispatch error for job ${jobId}: ${(err as Error).message}`, { jobId });
    }
  }

  await logger.info(`Upload triggered for job ${jobId}`, { jobId });
  return NextResponse.json({ ok: true, status: "dispatched" });
}
