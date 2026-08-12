import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createOAuth2Client, buildAuthUrl } from "@/lib/youtube/client";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate a random state to prevent CSRF
  const state = Buffer.from(
    JSON.stringify({ uid: user.id, ts: Date.now() })
  ).toString("base64url");

  const client = createOAuth2Client();
  const authUrl = buildAuthUrl(client, state);

  return NextResponse.json({ authUrl, state });
}
