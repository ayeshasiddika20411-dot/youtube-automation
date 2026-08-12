import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Clapperboard, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function VideosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db: any = supabase;

  const { data: jobs } = await db
    .from("content_jobs")
    .select("id, topic, status, created_at")
    .eq("user_id", user.id)
    .in("status", ["completed", "upload"])
    .order("created_at", { ascending: false });

  const completed: any[] = [];
  for (const job of jobs ?? []) {
    const { data: video } = await db
      .from("videos")
      .select("*")
      .eq("job_id", job.id)
      .maybeSingle();
    const { data: upload } = await db
      .from("youtube_uploads")
      .select("*")
      .eq("job_id", job.id)
      .maybeSingle();
    completed.push({ ...job, video, upload });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Generated Videos
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Videos that have been rendered and/or uploaded to YouTube.
        </p>
      </div>

      {completed.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Clapperboard className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No generated videos yet. Complete a job to see it here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {completed.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="truncate">{item.topic}</CardTitle>
                  <Badge variant="success">Completed</Badge>
                </div>
                <CardDescription>
                  {item.video?.resolution
                    ? `${item.video.resolution}`
                    : "No resolution"}
                  {" · "}
                  {item.video?.duration
                    ? `${Math.round(item.video.duration)}s`
                    : "No duration"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {item.upload?.url ? (
                  <a
                    href={item.upload.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View on YouTube
                  </a>
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Not uploaded yet
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
