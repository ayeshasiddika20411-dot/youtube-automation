import type { Database } from "@/types/database";
import type { UserSettings } from "@/types/db";

type QueryClient = {
  from: <T extends keyof Database["public"]["Tables"]>(table: T) => any;
};

export class SettingsRepository {
  constructor(private client: QueryClient) {}

  async get(userId: string): Promise<UserSettings | null> {
    const { data, error } = await this.client
      .from("settings")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (error) return null;
    return (data as unknown as UserSettings) ?? null;
  }

  async upsert(
    userId: string,
    patch: Partial<Omit<UserSettings, "id" | "user_id" | "created_at">>
  ): Promise<UserSettings> {
    const { data, error } = await this.client
      .from("settings")
      .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;
    return data as unknown as UserSettings;
  }
}
