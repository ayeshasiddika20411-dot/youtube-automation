import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SettingsRepository } from "@/lib/repositories/settingsRepository";
import type { UserSettings } from "@/types/db";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repo = new SettingsRepository(supabase);
  let settings = await repo.get(user.id);
  if (!settings) {
    settings = await repo.upsert(user.id, {
      ai_provider: "gemini",
      voice: "",
      default_language: "en",
      video_duration: 60,
      upload_defaults: {},
      publishing_preferences: {},
    });
  }

  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<
    Omit<UserSettings, "id" | "user_id" | "created_at">
  >;

  // Whitelist allowed fields
  const allowed: (keyof typeof body)[] = [
    "ai_provider",
    "voice",
    "default_language",
    "video_duration",
    "upload_defaults",
    "publishing_preferences",
  ];
  const patch: Partial<typeof body> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      (patch as Record<string, unknown>)[key as string] = body[key];
    }
  }

  const repo = new SettingsRepository(supabase);
  const settings = await repo.upsert(user.id, patch);
  return NextResponse.json({ settings });
}
