import type { Database } from "@/types/database";
import type { Project } from "@/types/db";

type QueryClient = {
  from: <T extends keyof Database["public"]["Tables"]>(table: T) => any;
};

export class ProjectsRepository {
  constructor(private client: QueryClient) {}

  async list(userId: string): Promise<Project[]> {
    const { data, error } = await this.client
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as unknown as Project[]) ?? [];
  }

  async getById(id: string, userId: string): Promise<Project | null> {
    const { data, error } = await this.client
      .from("projects")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (error) return null;
    return (data as unknown as Project) ?? null;
  }

  async create(input: {
    userId: string;
    name: string;
    description?: string | null;
    niche?: string | null;
  }): Promise<Project> {
    const { data, error } = await this.client
      .from("projects")
      .insert({
        user_id: input.userId,
        name: input.name,
        description: input.description ?? null,
        niche: input.niche ?? null,
        status: "active",
      })
      .select()
      .single();
    if (error) throw error;
    return data as unknown as Project;
  }

  async update(
    id: string,
    userId: string,
    patch: Partial<Pick<Project, "name" | "description" | "niche" | "status">>
  ): Promise<void> {
    const { error } = await this.client
      .from("projects")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  }

  async archive(id: string, userId: string): Promise<void> {
    await this.update(id, userId, { status: "archived" });
  }
}
