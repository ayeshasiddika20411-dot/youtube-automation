import path from "path";
import { mkdir } from "fs/promises";
import { createStockMediaProvider } from "@/lib/stockMedia";
import {
  getScenes,
  insertStockAsset,
} from "@/lib/repositories/jobsRepository";
import { logger } from "@/lib/services/logger";
import type { StageModule } from "../types";

/**
 * Stock media stage: search & download stock footage/images for each scene.
 * (Heavy stage — runs in the GitHub Actions worker.)
 */
export const stockMediaStage: StageModule = {
  name: "stock_media",
  mode: "heavy",
  async run(ctx) {
    const provider = createStockMediaProvider(ctx.provider);
    const scenes = await getScenes(ctx.client, ctx.jobId);
    const downloadDir = path.join(process.cwd(), "tmp", "media", ctx.jobId);
    await mkdir(downloadDir, { recursive: true });

    let downloaded = 0;
    let fallbacks = 0;

    for (const scene of scenes) {
      const keywords = (scene.search_keywords as unknown as string[]) ?? [];
      const query = keywords.join(" ");
      let result = null;

      // Try each keyword combination until something returns results
      for (const kw of keywords.length > 0 ? keywords : ["overview"]) {
        const results = await provider.search(kw, { count: 1, type: "video" });
        if (results.length > 0) {
          result = results[0];
          break;
        }
      }

      if (!result) {
        // Fallback: broad search
        const fallback = await provider.search("nature background", {
          count: 1,
          type: "video",
        });
        if (fallback.length > 0) {
          result = { ...fallback[0], fallback: true };
          fallbacks++;
        } else {
          await logger.warn(`No stock media found for job ${ctx.jobId} scene ${scene.scene_index}`, { jobId: ctx.jobId });
          continue;
        }
      }

      const ext = path.extname(new URL(result.url).pathname) || ".mp4";
      const localPath = path.join(downloadDir, `scene-${scene.scene_index}${ext}`);
      await provider.download(result, localPath);
await insertStockAsset(ctx.client, {
        job_id: ctx.jobId,
        scene_id: (scene.id as string) ?? null,
        provider: result.provider,
        source_url: result.url,
        local_path: localPath,
        license_info: result.licenseInfo,
        fallback_used: !!result.fallback,
      });
      downloaded++;
    }

    await logger.info(`Stock media downloaded for job ${ctx.jobId} (${downloaded} files, ${fallbacks} fallbacks)`, { jobId: ctx.jobId });
    return {
      status: "success",
      data: { downloaded, fallbacks },
      message: `Downloaded ${downloaded} stock media files`,
    };
  },
};
