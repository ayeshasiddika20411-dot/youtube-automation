import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApiKeysRepository } from "@/lib/repositories/apiKeysRepository";

const VALID_PROVIDERS = [
  "gemini",
  "groq",
  "pexels",
  "pixabay",
  "youtube",
];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repo = new ApiKeysRepository(supabase);
  const keys = await repo.list(user.id);
  // Only return provider + created_at — never the secret
  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const provider = body?.provider;
  const key = body?.key;

  if (!provider || !VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json(
      { error: `Invalid provider. Valid: ${VALID_PROVIDERS.join(", ")}` },
      { status: 400 }
    );
  }
  if (!key || typeof key !== "string" || key.trim().length === 0) {
    return NextResponse.json(
      { error: "API key is required" },
      { status: 400 }
    );
  }

  const repo = new ApiKeysRepository(supabase);
  await repo.save(user.id, provider, key.trim());
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");
  if (!provider || !VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json(
      { error: `Invalid provider. Valid: ${VALID_PROVIDERS.join(", ")}` },
      { status: 400 }
    );
  }

  const repo = new ApiKeysRepository(supabase);
  await repo.delete(user.id, provider);
  return NextResponse.json({ ok: true });
}
