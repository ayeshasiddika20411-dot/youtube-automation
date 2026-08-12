import type { JobStatus } from "./db";

// ============================================================
// Pipeline types — shared between API routes and worker
// ============================================================

/** Result of running a single pipeline stage */
export interface StageResult {
  status: "success" | "skipped";
  /** Arbitrary data the next stage may use */
  data?: Record<string, unknown>;
  message?: string;
}

/** What a stage function receives */
export interface StageContext {
  jobId: string;
  userId: string;
  projectId: string | null;
  topic: string;
  /** current status before running this stage */
  currentStatus: JobStatus;
}

/** Defines a runnable pipeline stage */
export interface Stage<TInput = unknown, TOutput = unknown> {
  name: JobStatus;
  /** Whether this stage requires a worker (heavy) vs API route (light) */
  mode: "light" | "heavy";
  run(ctx: StageContext, input?: TInput): Promise<StageResult>;
}

/** The ordered list of stages in the pipeline */
export const PIPELINE_STAGES: Exclude<JobStatus, "failed" | "completed">[] = [
  "pending",
  "research",
  "script",
  "seo",
  "scene_planning",
  "stock_media",
  "voice",
  "subtitles",
  "video_rendering",
  "ready_for_review",
  "upload",
];

/** Heavy stages = run in the GitHub Actions worker */
export const HEAVY_STAGES: JobStatus[] = [
  "stock_media",
  "voice",
  "subtitles",
  "video_rendering",
  "upload",
];

/** Light stages = run in API routes for live progress */
export const LIGHT_STAGES: JobStatus[] = [
  "research",
  "script",
  "seo",
  "scene_planning",
];

export function isHeavyStage(status: JobStatus): boolean {
  return HEAVY_STAGES.includes(status);
}

export function isLightStage(status: JobStatus): boolean {
  return LIGHT_STAGES.includes(status);
}

export function nextStage(status: JobStatus): JobStatus | null {
  const idx = PIPELINE_STAGES.indexOf(status as Exclude<JobStatus, "failed" | "completed">);
  if (idx === -1) return null;
  return PIPELINE_STAGES[idx + 1] ?? null;
}
