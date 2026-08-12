import type { JobStatus, ContentJob, Script, SeoMetadata, Scene } from "@/types/db";

export interface PipelineContext {
  jobId: string;
  userId: string;
  projectId: string | null;
  topic: string;
  status: JobStatus;
  /** Service-role client for the worker; RLS client for API routes */
  client: any;
  /** Optional override of AI/stock provider */
  provider?: string;
}

export interface StageResult {
  status: "success" | "skipped";
  data?: Record<string, unknown>;
  message?: string;
}

export interface StageModule {
  name: JobStatus;
  mode: "light" | "heavy";
  run(ctx: PipelineContext): Promise<StageResult>;
}

export interface JobWithRelations extends Omit<ContentJob, "script"> {
  script?: Script | null;
  seo?: SeoMetadata | null;
  scenes?: Scene[];
}
