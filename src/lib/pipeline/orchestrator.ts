import { JobsRepository } from "@/lib/repositories/jobsRepository";
import { logger } from "@/lib/services/logger";
import type { JobStatus } from "@/types/db";
import { nextStage } from "@/types/pipeline";
import type { PipelineContext, StageResult } from "./types";
import { researchStage } from "./stages/researchStage";
import { scriptStage } from "./stages/scriptStage";
import { seoStage } from "./stages/seoStage";
import { scenePlanningStage } from "./stages/scenePlanningStage";
import { stockMediaStage } from "./stages/stockMediaStage";
import { voiceStage } from "./stages/voiceStage";
import { subtitlesStage } from "./stages/subtitlesStage";
import { videoRenderingStage } from "./stages/videoRenderingStage";
import { uploadStage } from "./stages/uploadStage";

const MAX_RETRIES = Number(process.env.MAX_RETRIES ?? 3);

/** Map status → stage module */
const STAGE_MAP: Partial<Record<JobStatus, (ctx: PipelineContext) => Promise<StageResult>>> = {
  research: (ctx) => researchStage.run(ctx),
  script: (ctx) => scriptStage.run(ctx),
  seo: (ctx) => seoStage.run(ctx),
  scene_planning: (ctx) => scenePlanningStage.run(ctx),
  stock_media: (ctx) => stockMediaStage.run(ctx),
  voice: (ctx) => voiceStage.run(ctx),
  subtitles: (ctx) => subtitlesStage.run(ctx),
  video_rendering: (ctx) => videoRenderingStage.run(ctx),
  upload: (ctx) => uploadStage.run(ctx),
};

export interface OrchestratorOptions {
  client: any;
  /** Optional extra data injected into context (e.g. seo metadata) */
  seed?: Record<string, unknown>;
}

/**
 * Run the next pipeline stage for a job. Handles:
 *  - advancing status
 *  - retry counting + exponential backoff (max MAX_RETRIES)
 *  - logging to system_logs
 *  - marking failed after exhausting retries
 *  - the manual-approval gate before upload
 */
export async function runNextStage(
  jobId: string,
  opts: OrchestratorOptions
): Promise<{ advanced: boolean; nextStatus?: JobStatus; failed?: boolean }> {
  const repo = new JobsRepository(opts.client);
  const job = await repo.getJobById(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  // Manual approval gate: do NOT auto-advance from ready_for_review to upload.
  // The user must call /api/jobs/[id]/approve.
  if (job.status === "ready_for_review") {
    return { advanced: false, nextStatus: "ready_for_review" };
  }

  // completed / failed are terminal
  if (job.status === "completed" || job.status === "failed") {
    return { advanced: false, nextStatus: job.status };
  }

  const stageFn = STAGE_MAP[job.status];
  if (!stageFn) {
    // pending → advance to research
    if (job.status === "pending") {
      await repo.advanceJob(jobId, "pending");
      const next = nextStage("pending");
      return { advanced: true, nextStatus: next ?? "research" };
    }
    throw new Error(`No stage handler for status: ${job.status}`);
  }

  const ctx: PipelineContext = {
    jobId: job.id,
    userId: job.user_id,
    projectId: job.project_id,
    topic: job.topic,
    status: job.status,
    client: opts.client,
    ...(opts.seed ?? {}),
  };

  const startedAt = Date.now();
  try {
    const result = await stageFn(ctx);
    const durationMs = Date.now() - startedAt;

    await logger.info(`Stage ${job.status} succeeded for job ${jobId}`, {
      jobId,
      durationMs,
      context: { message: result.message },
    });

    // Reset retry count on success
    await repo.resetRetry(jobId);

    // Advance to next stage
    const next = await repo.advanceJob(jobId, job.status);
    return { advanced: true, nextStatus: next ?? undefined };
  } catch (err) {
    const message = (err as Error).message ?? "Unknown error";
    const durationMs = Date.now() - startedAt;

    await logger.error(`Stage ${job.status} failed for job ${jobId}: ${message}`, {
      jobId,
      durationMs,
      level: "error",
    });

    const retryCount = await repo.incrementRetry(jobId, message);
    if (retryCount >= MAX_RETRIES) {
      await repo.updateStatus(jobId, "failed", message);
      await logger.error(`Job ${jobId} failed after ${MAX_RETRIES} retries`, {
        jobId,
        level: "error",
      });
      return { advanced: false, failed: true };
    }

    await logger.warn(`Job ${jobId} stage ${job.status} will retry (attempt ${retryCount}/${MAX_RETRIES})`, {
      jobId,
      level: "warn",
    });
    return { advanced: false };
  }
}

/**
 * Approve a job: advances from ready_for_review → upload.
 * Called by the user from the dashboard.
 */
export async function approveJobForUpload(
  jobId: string,
  opts: { client: any }
): Promise<{ approved: boolean; nextStatus?: JobStatus }> {
  const repo = new JobsRepository(opts.client);
  const job = await repo.getJobById(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);

  if (job.status !== "ready_for_review") {
    throw new Error(`Job ${jobId} is not ready for review (status: ${job.status})`);
  }

  await repo.advanceJob(jobId, "ready_for_review");
  return { approved: true, nextStatus: "upload" };
}

/** Run a full pipeline from current status until it hits a stopping point */
export async function runPipelineUntilStop(
  jobId: string,
  opts: OrchestratorOptions,
  maxSteps = 10
): Promise<{
  steps: number;
  finalStatus?: JobStatus;
  failed?: boolean;
}> {
  let steps = 0;
  let current = await new JobsRepository(opts.client).getJobById(jobId);
  let result: { advanced: boolean; nextStatus?: JobStatus; failed?: boolean } | null = null;

  while (current && steps < maxSteps) {
    const status = current.status;
    // Stop conditions
    if (
      status === "ready_for_review" ||
      status === "completed" ||
      status === "failed"
    ) {
      return { steps, finalStatus: status, failed: status === "failed" };
    }
    // Heavy stages and upload must run in the worker
    if (["stock_media", "voice", "subtitles", "video_rendering", "upload"].includes(status)) {
      return { steps, finalStatus: status };
    }

    result = await runNextStage(jobId, opts);
    steps++;
    if (result.failed) {
      return { steps, finalStatus: "failed", failed: true };
    }
    if (!result.advanced) {
      return { steps, finalStatus: result.nextStatus ?? status };
    }
    current = await new JobsRepository(opts.client).getJobById(jobId);
  }

  return { steps, finalStatus: current?.status };
}
