"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SettingsData {
  id: string;
  user_id: string;
  ai_provider: string;
  voice: string;
  default_language: string;
  video_duration: number;
  upload_defaults: Record<string, unknown>;
  publishing_preferences: Record<string, unknown>;
}

export function SettingsForm({ settings }: { settings: SettingsData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [aiProvider, setAiProvider] = useState(settings.ai_provider ?? "gemini");
  const [voice, setVoice] = useState(settings.voice ?? "");
  const [language, setLanguage] = useState(settings.default_language ?? "en");
  const [duration, setDuration] = useState(settings.video_duration ?? 60);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_provider: aiProvider,
          voice,
          default_language: language,
          video_duration: Number(duration),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      toast.success("Settings saved");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            AI Provider
          </label>
          <select
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value)}
            className={inputCls}
          >
            <option value="gemini">Gemini</option>
            <option value="groq">Groq</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Default Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={inputCls}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="hi">Hindi</option>
            <option value="pt">Portuguese</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Voice (Edge TTS)
          </label>
          <input
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            placeholder="en-US-JennyNeural"
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Video Duration (seconds)
          </label>
          <input
            type="number"
            min={15}
            max={600}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className={inputCls}
          />
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Save Settings
      </Button>
    </form>
  );
}
