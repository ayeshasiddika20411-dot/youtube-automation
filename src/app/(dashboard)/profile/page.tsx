import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { User } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db: any = supabase;
  const { data: profile } = await db
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Profile
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Your account information.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <User className="h-8 w-8 text-zinc-500 dark:text-zinc-400" />
            </div>
            <div>
              <CardTitle>
                {profile?.display_name || user.email?.split("@")[0] || "User"}
              </CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">
              Display Name
            </p>
            <p className="text-sm text-zinc-800 dark:text-zinc-200">
              {profile?.display_name || "--"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">
              Language
            </p>
            <p className="text-sm text-zinc-800 dark:text-zinc-200">
              {profile?.default_language || "en"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">
              Timezone
            </p>
            <p className="text-sm text-zinc-800 dark:text-zinc-200">
              {profile?.timezone || "--"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">
              Member Since
            </p>
            <p className="text-sm text-zinc-800 dark:text-zinc-200">
              {user.created_at
                ? new Date(user.created_at).toLocaleDateString()
                : "--"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
