import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { JobsRepository } from "@/lib/repositories/jobsRepository";
import { runPipelineUntilStop } from "@/lib/pipeline";
import { logger } from "@/lib/services/logger";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const projectId = searchParams.get("projectId");
  const limit = Number(searchParams.get("limit") ?? 50);

  const repo = new JobsRepository(supabase);
  const jobs = await repo.listJobs({
    userId: user.id,
    status: (status as any) ?? undefined,
    projectId: projectId ?? undefined,
    limit,
  });

  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const topic = body?.topic;
  const projectId = body?.projectId ?? null;

  if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  }

  const repo = new JobsRepository(supabase);
  const job = await repo.createJob({
    userId: user.id,
    projectId,
    topic: topic.trim(),
    status: "pending",
  });

  // Kick off the light stages (research → script → seo → scene_planning)
  // in the background so the dashboard shows live progress.
runPipelineUntilStop(job.id, { client: supabase }, 4).catch((err) =>
    logger.error(`Background pipeline start failed for job ${job.id}: ${err.message}`, { jobId: job.id })
  );

  return NextResponse.json({ job }, { status: 201 });
}
