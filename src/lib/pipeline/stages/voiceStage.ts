import { getScript, insertVoiceFile } from "@/lib/repositories/jobsRepository";
import {
  synthesizeSpeech,
  buildScriptForTTS,
} from "@/lib/voice/edgeTts";
import { logger } from "@/lib/services/logger";
import type { StageModule } from "../types";

/**
 * Voice stage: synthesize the script narration using Edge TTS.
 * (Heavy stage — runs in the GitHub Actions worker.)
 */
export const voiceStage: StageModule = {
  name: "voice",
  mode: "heavy",
  async run(ctx) {
    const script = (await getScript(ctx.client, ctx.jobId)) as {
      hook: string | null;
      introduction: string | null;
      main_content: string | null;
      ending: string | null;
      cta: string | null;
    } | null;

    if (!script) {
      throw new Error(`No script found for job ${ctx.jobId}`);
    }

    const text = buildScriptForTTS(script);
    const result = await synthesizeSpeech(text, {
      voice: process.env.DEFAULT_VOICE ?? "en-US-JennyNeural",
    });

    await insertVoiceFile(ctx.client, {
      job_id: ctx.jobId,
      storage_path: result.audioFilePath,
      voice_name: process.env.DEFAULT_VOICE ?? "en-US-JennyNeural",
      duration: result.durationSeconds,
      format: "mp3",
    });

    await logger.info(`Voice synthesized for job ${ctx.jobId} (${result.durationSeconds}s)`, { jobId: ctx.jobId });
    return {
      status: "success",
      data: { durationSeconds: result.durationSeconds, audioPath: result.audioFilePath },
      message: "Voiceover synthesized",
    };
  },
};
