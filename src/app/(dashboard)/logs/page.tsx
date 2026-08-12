import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ScrollText } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const levelVariant: Record<
  string,
  "success" | "warning" | "destructive" | "default" | "muted"
> = {
  info: "default",
  warn: "warning",
  error: "destructive",
  debug: "muted",
};

export default async function LogsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db: any = supabase;
  const { data: logs } = await db
    .from("system_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          System Logs
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Recent pipeline and system activity.
        </p>
      </div>

      {!logs || logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <ScrollText className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No logs yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {logs.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 py-3">
                <Badge variant={levelVariant[log.level] ?? "default"}>
                  {log.level}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-800 dark:text-zinc-200">
                    {log.message}
                  </p>
                  {log.context && Object.keys(log.context).length > 0 && (
                    <pre className="mt-1 overflow-x-auto rounded bg-zinc-100 p-2 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {JSON.stringify(log.context, null, 2)}
                    </pre>
                  )}
                </div>
                <span className="shrink-0 text-xs text-zinc-400">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
