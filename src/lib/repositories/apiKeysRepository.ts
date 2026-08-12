import type { Database } from "@/types/database";
import { encryptSecret, decryptSecret } from "@/lib/utils/encryption";

type QueryClient = {
  from: <T extends keyof Database["public"]["Tables"]>(table: T) => any;
};

export interface ApiKeyRecord {
  id: string;
  user_id: string;
  provider: string;
  encrypted_key: string;
  created_at: string;
  updated_at: string;
}

/**
 * Repository for api_keys. Secrets are encrypted at rest and never exposed
 * to the client after write.
 */
export class ApiKeysRepository {
  constructor(private client: QueryClient) {}

  async list(userId: string): Promise<{ provider: string; created_at: string }[]> {
    const { data, error } = await this.client
      .from("api_keys")
      .select("provider, created_at")
      .eq("user_id", userId);
    if (error) throw error;
    return (data as unknown as { provider: string; created_at: string }[]) ?? [];
  }

  async getProviderKey(userId: string, provider: string): Promise<string | null> {
    const { data, error } = await this.client
      .from("api_keys")
      .select("encrypted_key")
      .eq("user_id", userId)
      .eq("provider", provider)
      .single();
    if (error) return null;
    const row = data as unknown as ApiKeyRecord;
    try {
      return decryptSecret(row.encrypted_key);
    } catch {
      return null;
    }
  }

  async save(userId: string, provider: string, plaintextKey: string): Promise<void> {
    const encrypted = encryptSecret(plaintextKey);
    const { error } = await this.client
      .from("api_keys")
      .upsert(
        {
          user_id: userId,
          provider,
          encrypted_key: encrypted,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "user_id,provider" }
      );
    if (error) throw error;
  }

  async delete(userId: string, provider: string): Promise<void> {
    const { error } = await this.client
      .from("api_keys")
      .delete()
      .eq("user_id", userId)
      .eq("provider", provider);
    if (error) throw error;
  }
}
