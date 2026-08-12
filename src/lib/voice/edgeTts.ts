import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { mkdir } from "fs/promises";
import path from "path";

export interface TTSSynthesisResult {
  audioFilePath: string;
  metadataFilePath: string | null;
  durationSeconds: number;
}

export interface EdgeTTSOptions {
  /** Voice short name, e.g. en-US-JennyNeural */
  voice?: string;
  /** Output directory */
  outputDir?: string;
  /** Output format (mp3 or opus) */
  outputFormat?: "mp3" | "opus";
}

/**
 * Edge TTS voice synthesis. Uses msedge-tts (pure Node WebSocket client for
 * Microsoft Edge's Read Aloud API — no external Python/CLI dependency).
 *
 * Also captures word-boundary metadata for accurate subtitle timing.
 */
export async function synthesizeSpeech(
  text: string,
  opts: EdgeTTSOptions = {}
): Promise<TTSSynthesisResult> {
  const voice = opts.voice ?? process.env.DEFAULT_VOICE ?? "en-US-JennyNeural";
  const outputFormat = opts.outputFormat ?? "mp3";
  const outputDir = opts.outputDir ?? path.join(process.cwd(), "tmp", "voice");

  await mkdir(outputDir, { recursive: true });

  const tts = new MsEdgeTTS();

  try {
    const format =
      outputFormat === "opus"
        ? OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS
        : OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3;

    await tts.setMetadata(voice, format, {
      wordBoundaryEnabled: true,
    });

    const result = await tts.toFile(outputDir, text, {
      rate: 0,
      volume: 100,
      // msedge-tts accepts pitch as a named value or an SSML-compatible string.
      pitch: "0Hz",
    });

    // Rough duration estimate: ~15 chars/sec for English speech
    const durationSeconds = estimateDuration(result.audioFilePath, text);

    return {
      audioFilePath: result.audioFilePath,
      metadataFilePath: result.metadataFilePath,
      durationSeconds,
    };
  } finally {
    tts.close();
  }
}

/**
 * Estimate audio duration. If ffprobe is available we could compute exact,
 * but as a fallback use a words-per-second heuristic.
 */
function estimateDuration(_filePath: string, text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  // ~2.5 words/sec typical narration pace
  return Math.max(1, Math.round((words / 2.5) * 10) / 10);
}

/** Synthesize a full script (concatenating hook+intro+main+ending+cta) */
export function buildScriptForTTS(script: {
  hook: string | null;
  introduction: string | null;
  main_content: string | null;
  ending: string | null;
  cta: string | null;
}): string {
  return [
    script.hook,
    script.introduction,
    script.main_content,
    script.ending,
    script.cta,
  ]
    .filter(Boolean)
    .join("\n\n");
}
