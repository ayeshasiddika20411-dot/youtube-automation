import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ProjectsRepository } from "@/lib/repositories/projectsRepository";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repo = new ProjectsRepository(supabase);
  const projects = await repo.list(user.id);
  return NextResponse.json({ projects });
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
  const name = body?.name;
  const description = body?.description ?? null;
  const niche = body?.niche ?? null;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Project name is required" },
      { status: 400 }
    );
  }

  const repo = new ProjectsRepository(supabase);
  const project = await repo.create({
    userId: user.id,
    name: name.trim(),
    description,
    niche,
  });

  return NextResponse.json({ project }, { status: 201 });
}
