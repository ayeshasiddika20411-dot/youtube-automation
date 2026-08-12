import { SeoService } from "@/lib/services/seoService";
import { getScript, upsertSeo } from "@/lib/repositories/jobsRepository";
import { logger } from "@/lib/services/logger";
import type { StageModule } from "../types";

/**
 * SEO stage: generate YouTube metadata (title, description, tags, etc.).
 * (Light stage — runs in API route.)
 */
export const seoStage: StageModule = {
  name: "seo",
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

    const service = new SeoService(ctx.provider);
    const seo = await service.generateSeo({
      topic: ctx.topic,
      scriptText,
    });

    await upsertSeo(ctx.client, {
      job_id: ctx.jobId,
      title: seo.title,
      description: seo.description,
      hashtags: seo.hashtags,
      keywords: seo.keywords,
      tags: seo.tags,
      thumbnail_title: seo.thumbnail_title,
      pinned_comment: seo.pinned_comment,
    });

    await logger.info(`SEO metadata generated for job ${ctx.jobId}`, { jobId: ctx.jobId });
    return {
      status: "success",
      data: { title: seo.title },
      message: "SEO metadata generated",
    };
  },
};
