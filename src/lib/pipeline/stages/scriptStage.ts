import { ScriptService } from "@/lib/services/scriptService";
import { upsertScript } from "@/lib/repositories/jobsRepository";
import { logger } from "@/lib/services/logger";
import type { StageModule } from "../types";

/**
 * Script stage: generate the full video script and persist it.
 * (Light stage — runs in API route for live progress.)
 */
export const scriptStage: StageModule = {
  name: "script",
  mode: "light",
  async run(ctx) {
    const service = new ScriptService(ctx.provider);
    const script = await service.generateScript(ctx.topic, {
      targetDuration: 60,
      niche: ctx.topic,
    });

    await upsertScript(ctx.client, {
      job_id: ctx.jobId,
      hook: script.hook,
      introduction: script.introduction,
      main_content: script.main_content,
      ending: script.ending,
      cta: script.cta,
      language: script.language,
      style: script.style,
      length_seconds: script.length_seconds,
    });

    await logger.info(`Script generated for job ${ctx.jobId}`, { jobId: ctx.jobId });
    return {
      status: "success",
      data: { length_seconds: script.length_seconds },
      message: "Script generated",
    };
  },
};
