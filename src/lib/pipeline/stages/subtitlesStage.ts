import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { getScenes, insertSubtitleFile } from "@/lib/repositories/jobsRepository";
import { generateSrt } from "@/lib/subtitles/srtGenerator";
import { logger } from "@/lib/services/logger";
import type { StageModule } from "../types";

/**
 * Subtitles stage: generate SRT subtitle file from the scene narration.
 * (Heavy stage — runs in the GitHub Actions worker.)
 */
export const subtitlesStage: StageModule = {
  name: "subtitles",
  mode: "heavy",
  async run(ctx) {
    const scenes = (await getScenes(ctx.client, ctx.jobId)) as {
      scene_index: number;
      narration: string | null;
    }[];

    const fullText = scenes
      .map((s) => s.narration ?? "")
      .filter(Boolean)
      .join("\n");

    const srt = generateSrt(fullText);

    const dir = path.join(process.cwd(), "tmp", "subtitles", ctx.jobId);
    await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, "subtitles.srt");
    await writeFile(filePath, srt, "utf8");

    await insertSubtitleFile(ctx.client, {
      job_id: ctx.jobId,
      storage_path: filePath,
      format: "srt",
      has_word_timestamps: false,
    });

    await logger.info(`Subtitles generated for job ${ctx.jobId}`, { jobId: ctx.jobId });
    return {
      status: "success",
      data: { subtitlePath: filePath },
      message: "Subtitles generated",
    };
  },
};
