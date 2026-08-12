import { uploadToYouTube } from "@/lib/youtube/uploader";
import { ApiKeysRepository } from "@/lib/repositories/apiKeysRepository";
import {
  getScript,
  upsertYoutubeUpload,
} from "@/lib/repositories/jobsRepository";
import { logger } from "@/lib/services/logger";
import type { StageModule } from "../types";

/**
 * Upload stage: upload the rendered video to YouTube.
 * (Heavy stage — runs in the GitHub Actions worker.)
 */
export const uploadStage: StageModule = {
  name: "upload",
  mode: "heavy",
  async run(ctx) {
    // Get the user's YouTube refresh token (stored & encrypted in api_keys)
    const apiKeys = new ApiKeysRepository(ctx.client);
    const refreshToken = await apiKeys.getProviderKey(ctx.userId, "youtube");

    if (!refreshToken) {
      throw new Error(
        `No YouTube refresh token stored for user ${ctx.userId}. Connect YouTube first.`
      );
    }

    const videoPath = `${process.cwd()}/tmp/video/${ctx.jobId}/final.mp4`;
    const seo = (ctx as any)._seo ?? {};

    const script = (await getScript(ctx.client, ctx.jobId)) as {
      hook: string | null;
      introduction: string | null;
      main_content: string | null;
      ending: string | null;
      cta: string | null;
    } | null;

    const description = [
      seo.description ?? "",
      "",
      "—",
      `Topic: ${ctx.topic}`,
      seo.hashtags ? seo.hashtags.map((h: string) => `#${h}`).join(" ") : "",
    ].join("\n");

    const result = await uploadToYouTube(videoPath, refreshToken, {
      title: seo.title ?? ctx.topic,
      description,
      tags: seo.tags ?? [],
      privacyStatus: "private",
      categoryId: "22",
    });

    await upsertYoutubeUpload(ctx.client, {
      job_id: ctx.jobId,
      user_id: ctx.userId,
      video_id: result.videoId,
      url: result.url,
      publish_status: "published",
      title: result.title,
      visibility: "private",
      playlist_id: null,
      category: null,
      language: null,
      uploaded_at: new Date().toISOString(),
    });

    await logger.info(`Uploaded job ${ctx.jobId} to YouTube (${result.url})`, { jobId: ctx.jobId });
    return {
      status: "success",
      data: { videoId: result.videoId, url: result.url },
      message: "Video uploaded to YouTube",
    };
  },
};
