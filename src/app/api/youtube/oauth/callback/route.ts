import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { exchangeCode } from "@/lib/youtube/client";
import { ApiKeysRepository } from "@/lib/repositories/apiKeysRepository";
import { encryptSecret } from "@/lib/utils/encryption";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${origin}/settings/api-keys?youtube=error&message=${encodeURIComponent(error)}`
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(
      `${origin}/settings/api-keys?youtube=error&message=Missing code or state`
    );
  }

  // Decode state to get the user id
  let uid: string | null = null;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    uid = decoded?.uid ?? null;
  } catch {
    return NextResponse.redirect(
      `${origin}/settings/api-keys?youtube=error&message=Invalid state`
    );
  }
  if (!uid) {
    return NextResponse.redirect(
      `${origin}/settings/api-keys?youtube=error&message=Invalid state`
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCode(code);
    const refreshToken = tokens.refresh_token;
    if (!refreshToken) {
      throw new Error("No refresh token returned by Google");
    }

    // Store the refresh token encrypted (service-role bypasses RLS)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll() {},
        },
      }
    );

    const encrypted = encryptSecret(refreshToken);
    const { error: upsertError } = await supabase
      .from("api_keys")
      .upsert(
        {
          user_id: uid,
          provider: "youtube",
          encrypted_key: encrypted,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );

    if (upsertError) throw upsertError;

    return NextResponse.redirect(
      `${origin}/settings/api-keys?youtube=connected`
    );
  } catch (err) {
    return NextResponse.redirect(
      `${origin}/settings/api-keys?youtube=error&message=${encodeURIComponent(
        (err as Error).message
      )}`
    );
  }
}
