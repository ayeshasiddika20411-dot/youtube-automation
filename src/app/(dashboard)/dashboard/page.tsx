import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Camera,
  Loader,
  CheckCircle2,
  AlertTriangle,
  Activity,
  PlayCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateJobForm } from "@/components/dashboard/create-job-form";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db: any = supabase;

  const [jobsRes, projectsRes, videosRes, logsRes] = await Promise.all([
    db.from("content_jobs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    db.from("projects").select("id").eq("user_id", user.id),
    db.from("videos").select("id").eq("user_id", user.id),
    db.from("system_logs").select("level, message, created_at").order("created_at", { ascending: false }).limit(8),
  ]);

  const jobs = jobsRes.data ?? [];
  const projectCount = projectsRes.data?.length ?? 0;
  const videoCount = videosRes.data?.length ?? 0;
  const logs = logsRes.data ?? [];

  const activeJobs = jobs.filter((j: any) =>
    ["pending", "research", "script", "seo", "scene_planning", "stock_media", "voice", "subtitles", "video_rendering"].includes(j.status)
  ).length;
  const completedThisWeek = jobs.filter((j: any) => j.status === "completed").length;
  const failedJobs = jobs.filter((j: any) => j.status === "failed").length;
  const readyForReview = jobs.filter((j: any) => j.status === "ready_for_review").length;
  const errorLogs = logs.filter((l: any) => l.level === "error").length;

  const stats = [
    { label: "Videos Generated", value: videoCount, icon: Camera },
    { label: "Active Jobs", value: activeJobs, icon: Loader },
    { label: "Ready for Review", value: readyForReview, icon: CheckCircle2 },
    { label: "Failed Jobs", value: failedJobs, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Dashboard
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Welcome back{user.email ? `, ${user.email.split("@")[0]}` : ""}.
          </p>
        </div>
        <CreateJobForm />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-5">
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
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Start creating content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/jobs">
              <Button variant="outline" className="w-full justify-start">
                <PlayCircle className="mr-2 h-4 w-4" /> View Jobs
              </Button>
            </Link>
            <Link href="/queue">
              <Button variant="outline" className="w-full justify-start">
                <Clock className="mr-2 h-4 w-4" /> Pipeline Queue
              </Button>
            </Link>
            <Link href="/projects">
              <Button variant="outline" className="w-full justify-start">
                <Sparkles className="mr-2 h-4 w-4" /> Manage Projects
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent jobs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
            <CardDescription>Latest content jobs in your pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No jobs yet. Create your first content job to get started.
              </p>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {jobs.slice(0, 5).map((job: any) => (
                  <div key={job.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {job.topic}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(job.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={job.status === "failed" ? "destructive" : job.status === "completed" ? "success" : "default"}>
                      {job.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle>System Logs</CardTitle>
          <CardDescription>Recent activity ({errorLogs} errors)</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No logs yet.
            </p>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-zinc-400" />
              <span className="text-zinc-600 dark:text-zinc-300">
                {logs[0]?.message}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
