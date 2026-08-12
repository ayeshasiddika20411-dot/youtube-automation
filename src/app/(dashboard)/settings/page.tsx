import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { SettingsForm } from "@/components/settings/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db: any = supabase;
  let { data: settings } = await db
    .from("settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!settings) {
    settings = {
      id: "new",
      user_id: user.id,
      ai_provider: "gemini",
      voice: "",
      default_language: "en",
      video_duration: 60,
      upload_defaults: {},
      publishing_preferences: {},
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Settings
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Configure your AI provider, voice, and content defaults.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content Generation</CardTitle>
          <CardDescription>
            Choose the AI provider and default voice for your videos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm settings={settings} />
        </CardContent>
      </Card>
    </div>
  );
}
