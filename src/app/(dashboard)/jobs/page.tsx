import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ListTodo } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateJobForm } from "@/components/dashboard/create-job-form";

export const dynamic = "force-dynamic";

const statusVariant: Record<
  string,
  "success" | "warning" | "destructive" | "default"
> = {
  completed: "success",
  failed: "destructive",
  ready_for_review: "warning",
  upload: "warning",
  pending: "default",
  research: "default",
  script: "default",
  seo: "default",
  scene_planning: "default",
  stock_media: "default",
  voice: "default",
  subtitles: "default",
  video_rendering: "default",
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db: any = supabase;
  let query = db
    .from("content_jobs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) query = query.eq("status", status);

  const { data: jobs } = await query;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Jobs
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Track your content generation pipeline.
          </p>
        </div>
        <CreateJobForm />
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["all", "All"],
          ["pending", "Pending"],
          ["completed", "Completed"],
          ["failed", "Failed"],
          ["ready_for_review", "Awaiting Review"],
        ].map(([key, label]) => (
          <Link key={key} href={key === "all" ? "/jobs" : `/jobs?status=${key}`}>
            <Badge
              variant={
                (!status && key === "all") || status === key
                  ? "default"
                  : "muted"
              }
            >
              {label}
            </Badge>
          </Link>
        ))}
      </div>

      {!jobs || jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <ListTodo className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No jobs found. Enter a topic above to create one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job: any) => (
            <Card key={job.id}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                    {job.topic}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant[job.status] ?? "default"}>
                      {job.status.replace(/_/g, " ")}
                    </Badge>
                    {job.last_error && (
                      <span className="text-xs text-red-500">
                        {job.last_error}
                      </span>
                    )}
                    <span className="text-xs text-zinc-400">
                      Retries: {job.retry_count}
                    </span>
                  </div>
                </div>
                <Badge variant="muted" className="shrink-0">
                  {new Date(job.created_at).toLocaleDateString()}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
