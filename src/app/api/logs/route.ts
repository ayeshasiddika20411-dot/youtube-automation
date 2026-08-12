import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");
  const level = searchParams.get("level");
  const limit = Number(searchParams.get("limit") ?? 100);

  let query = supabase.from("system_logs").select("*").order("created_at", { ascending: false }).limit(limit);
  if (jobId) query = query.eq("job_id", jobId);
  if (level) query = query.eq("level", level);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ logs: data ?? [] });
}
