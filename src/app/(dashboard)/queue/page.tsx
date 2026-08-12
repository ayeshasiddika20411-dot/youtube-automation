import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Loader, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TriggerAdvance } from "@/components/jobs/trigger-advance";

export const dynamic = "force-dynamic";

const HEAVY_STAGES = [
  "stock_media",
  "voice",
  "subtitles",
  "video_rendering",
  "upload",
];

export default async function QueuePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db: any = supabase;
  const { data: jobs } = await db
    .from("content_jobs")
    .select("*")
    .eq("user_id", user.id)
    .in("status", [
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
    ])
    .order("created_at", { ascending: true });

  const processed: any[] = [];
  const reviewing: any[] = [];
  const awaitingWorker: any[] = [];

  for (const job of jobs ?? []) {
    if (job.status === "ready_for_review") reviewing.push(job);
    else if (HEAVY_STAGES.includes(job.status)) awaitingWorker.push(job);
    else processed.push(job);
  }

  const sections = [
    { title: "Processing (light stages)", jobs: processed, icon: RefreshCw },
    { title: "Awaiting Worker (heavy stages)", jobs: awaitingWorker, icon: Loader },
    { title: "Ready for Review", jobs: reviewing, icon: RefreshCw },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Queue
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Jobs in the pipeline. Heavy stages run on the GitHub Actions worker.
        </p>
      </div>

      {sections.map((section) => (
        <div key={section.title} className="space-y-3">
          <div className="flex items-center gap-2">
            <section.icon className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {section.title}
            </h2>
            <Badge variant="muted">{section.jobs.length}</Badge>
          </div>

          {section.jobs.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-sm text-zinc-400">
                Nothing here.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {section.jobs.map((job: any) => (
                <Card key={job.id}>
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {job.topic}
                      </p>
                      <Badge variant="muted" className="mt-1">
                        {job.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    {job.status === "ready_for_review" ? (
                      <TriggerAdvance jobId={job.id} action="approve" />
                    ) : (
                      <TriggerAdvance jobId={job.id} action="advance" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
