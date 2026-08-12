import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { KeyRound, Play } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApiKeyForm } from "@/components/settings/api-key-form";
import { YoutubeConnect } from "@/components/settings/youtube-connect";

export const dynamic = "force-dynamic";

const PROVIDERS = ["gemini", "groq", "pexels", "pixabay"];

export default async function ApiKeysPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db: any = supabase;
  const { data: keys } = await db
    .from("api_keys")
    .select("provider, created_at")
    .eq("user_id", user.id);

  const configured = new Set((keys ?? []).map((k: any) => k.provider));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          API Keys
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Manage provider credentials. Keys are encrypted at rest.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>YouTube integration via OAuth</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/50">
<Play className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  YouTube
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {configured.has("youtube")
                    ? "Connected"
                    : "Connect to enable uploads"}
                </p>
              </div>
            </div>
            <YoutubeConnect connected={configured.has("youtube")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provider Keys</CardTitle>
          <CardDescription>
            Add API keys for AI and stock media providers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {PROVIDERS.map((provider) => (
            <div
              key={provider}
              className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <KeyRound className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
                </div>
                <div>
                  <p className="text-sm font-medium capitalize text-zinc-900 dark:text-zinc-50">
                    {provider}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {configured.has(provider)
                      ? "Configured"
                      : "Not configured"}
                  </p>
                </div>
              </div>
              <Badge variant={configured.has(provider) ? "success" : "muted"}>
                {configured.has(provider) ? "Active" : "Missing"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add New Key</CardTitle>
          <CardDescription>
            Your key is encrypted before it is stored and never shown again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeyForm />
        </CardContent>
      </Card>
    </div>
  );
}
