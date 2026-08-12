import { ScenePlannerService } from "@/lib/services/scenePlannerService";
import { getScript, insertScenes } from "@/lib/repositories/jobsRepository";
import { logger } from "@/lib/services/logger";
import type { StageModule } from "../types";

/**
 * Scene planning stage: split the script into visual scenes.
 * (Light stage — runs in API route.)
 */
export const scenePlanningStage: StageModule = {
  name: "scene_planning",
  mode: "light",
  async run(ctx) {
    const script = await getScript(ctx.client, ctx.jobId);
    const scriptText = [
      script?.hook,
      script?.introduction,
      script?.main_content,
      script?.ending,
      script?.cta,
    ]
      .filter(Boolean)
      .join("\n\n");

    const service = new ScenePlannerService(ctx.provider);
    const scenes = await service.planScenes({
      scriptText,
      targetDuration: 60,
    });

    await insertScenes(
      ctx.client,
      scenes.map((s) => ({
        job_id: ctx.jobId,
        scene_index: s.scene_index,
        narration: s.narration,
        search_keywords: s.search_keywords,
        duration: s.duration,
        transition: s.transition,
      }))
    );

    await logger.info(`Scene planning done for job ${ctx.jobId} (${scenes.length} scenes)`, { jobId: ctx.jobId });
    return {
      status: "success",
      data: { sceneCount: scenes.length },
      message: `Planned ${scenes.length} scenes`,
    };
  },
};
