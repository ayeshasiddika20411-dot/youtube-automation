import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { JobsRepository } from "@/lib/repositories/jobsRepository";
import { isLightStage } from "@/types/pipeline";
import { runNextStage } from "@/lib/pipeline";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const repo = new JobsRepository(supabase);
  const job = await repo.getJobByUser(id, user.id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Only light stages run in the API route. Heavy stages go through the worker.
  if (!isLightStage(job.status)) {
    return NextResponse.json(
      {
        error: `Stage "${job.status}" must be processed by the worker`,
        job,
      },
      { status: 409 }
    );
  }

  try {
    const result = await runNextStage(job.id, { client: supabase });
    return NextResponse.json({ job: await repo.getJobById(job.id), result });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
