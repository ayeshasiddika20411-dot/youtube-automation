import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FolderKanban, CalendarDays } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateProjectForm } from "@/components/dashboard/create-project-form";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db: any = supabase;
  const { data: projects } = await db
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Projects
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Organize your content by project or channel niche.
        </p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <CreateProjectForm />
        </CardContent>
      </Card>

      {!projects || projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <FolderKanban className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No projects yet. Create your first project to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: any) => (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle>{project.name}</CardTitle>
                  <Badge variant={project.status === "active" ? "success" : "muted"}>
                    {project.status}
                  </Badge>
                </div>
                {project.niche && (
                  <CardDescription>Niche: {project.niche}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {project.description && (
                  <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-300">
                    {project.description}
                  </p>
                )}
                <p className="flex items-center gap-1 text-xs text-zinc-400">
                  <CalendarDays className="h-3 w-3" />
                  Created {new Date(project.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
