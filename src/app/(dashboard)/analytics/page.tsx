import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BarChart3, Camera, Loader, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db: any = supabase;
  const { data: jobs } = await db
    .from("content_jobs")
    .select("status")
    .eq("user_id", user.id);

  const counts: Record<string, number> = {};
  for (const job of jobs ?? []) {
    counts[job.status] = (counts[job.status] ?? 0) + 1;
  }

  const total = jobs?.length ?? 0;
  const completed = counts.completed ?? 0;
  const failed = counts.failed ?? 0;
  const inProgress = total - completed - failed;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const stats = [
    { label: "Total Jobs", value: total, icon: BarChart3 },
    { label: "Completed", value: completed, icon: CheckCircle2 },
    { label: "In Progress", value: inProgress, icon: Loader },
    { label: "Failed", value: failed, icon: AlertTriangle },
  ];

  const stageOrder = [
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
    "completed",
    "failed",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Analytics
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Performance overview of your content pipeline.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <stat.icon className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                    {stat.value}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {stat.label}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Success Rate</CardTitle>
          <CardDescription>Completed vs total jobs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <p className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
              {successRate}%
            </p>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jobs by Stage</CardTitle>
          <CardDescription>Distribution across the pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stageOrder.map((stage) => {
              const count = counts[stage] ?? 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-sm text-zinc-600 dark:text-zinc-300">
                    {stage.replace(/_/g, " ")}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-zinc-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm text-zinc-500">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
