import { renderVideo } from "@/lib/video/ffmpegRenderer";
import { getScenes, upsertVideo } from "@/lib/repositories/jobsRepository";
import { logger } from "@/lib/services/logger";
import type { StageModule } from "../types";

/**
 * Video rendering stage: use FFmpeg to composite the stock media + voiceover
 * into a final video file.
 * (Heavy stage — runs in the GitHub Actions worker.)
 */
export const videoRenderingStage: StageModule = {
  name: "video_rendering",
  mode: "heavy",
  async run(ctx) {
    const scenes = (await getScenes(ctx.client, ctx.jobId)) as {
      id: string;
      scene_index: number;
      narration: string | null;
      duration: number | null;
    }[];

    // Gather stock assets for each scene. In a real pipeline these would be
    // fetched from the stock_assets table keyed by scene. For the skeleton we
    // reference files downloaded to tmp/media/<jobId>/scene-<i>.
    const sceneInputs = scenes.map((s) => ({
      inputPath: `${process.cwd()}/tmp/media/${ctx.jobId}/scene-${s.scene_index}.mp4`,
      duration: s.duration ?? 5,
      narration: s.narration ?? "",
    }));

    // Voiceover audio path (from voice stage)
    const audioPath = `${process.cwd()}/tmp/voice/audio.mp4`;

    const result = await renderVideo(sceneInputs, audioPath, {
      width: 1920,
      height: 1080,
      fps: 30,
      outputDir: `${process.cwd()}/tmp/video/${ctx.jobId}`,
      outputName: "final",
    });

    await upsertVideo(ctx.client, {
      job_id: ctx.jobId,
      storage_path: result.outputPath,
      resolution: result.resolution,
      duration: result.duration,
      status: "ready",
    });

    await logger.info(`Video rendered for job ${ctx.jobId} (${result.duration}s)`, { jobId: ctx.jobId });
    return {
      status: "success",
      data: { outputPath: result.outputPath, duration: result.duration },
      message: "Video rendered",
    };
  },
};
