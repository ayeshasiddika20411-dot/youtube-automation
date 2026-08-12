import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { mkdir } from "fs/promises";
import path from "path";

export interface RenderScene {
  /** Path to the stock media file (video or image) */
  inputPath: string;
  /** Duration in seconds */
  duration: number;
  /** Narration text for this scene (for optional subtitle burn-in) */
  narration?: string;
}

export interface RenderOptions {
  width?: number;
  height?: number;
  fps?: number;
  /** Output directory */
  outputDir?: string;
  /** Base filename (without extension) */
  outputName?: string;
}

export interface RenderResult {
  outputPath: string;
  duration: number;
  resolution: string;
}

// Configure ffmpeg static binary path for local/dev
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

/**
 * Render a final video by concatenating scenes and overlaying the voiceover
 * audio track. Uses fluent-ffmpeg.
 *
 * NOTE: This is a *heavy* operation and should run in the GitHub Actions
 * worker, not inside a Vercel serverless function.
 */
export async function renderVideo(
  scenes: RenderScene[],
  audioPath: string | null,
  opts: RenderOptions = {}
): Promise<RenderResult> {
  const width = opts.width ?? 1920;
  const height = opts.height ?? 1080;
  const fps = opts.fps ?? 30;
  const outputDir = opts.outputDir ?? path.join(process.cwd(), "tmp", "video");
  const outputName = opts.outputName ?? `output-${Date.now()}`;

  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${outputName}.mp4`);

  // Build a concat-safe approach: for simplicity, render each scene to a
  // normalized clip, then concat, then add audio. This is a simplified
  // pipeline; production would use a more robust segment-based approach.
  const normalizedClips: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const clipPath = path.join(outputDir, `${outputName}-scene-${i}.mp4`);
    await renderClip(scene, clipPath, width, height, fps);
    normalizedClips.push(clipPath);
  }

  // Concatenate clips
  await concatClips(normalizedClips, outputPath);

  // Add audio if provided
  if (audioPath) {
    await addAudio(outputPath, audioPath);
  }

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

  return {
    outputPath,
    duration: totalDuration,
    resolution: `${width}x${height}`,
  };
}

/** Render a single scene clip normalized to target resolution/fps */
function renderClip(
  scene: RenderScene,
  outPath: string,
  width: number,
  height: number,
  fps: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = scene.inputPath;
    const isImage = /\.(png|jpe?g|webp)$/i.test(input);
    const duration = scene.duration;

    let command = ffmpeg(input);

    if (isImage) {
      // Zoompan for subtle motion on still images
      const zoompan = `zoompan=z='min(zoom+0.0015,1.15)':d=${Math.round(
        duration * fps
      )}:s=${width}x${height}:fps=${fps}`;
      command = command
        .videoFilter(zoompan)
        .outputOptions([`-t ${duration}`]);
    } else {
      command = command
        .outputOptions([`-t ${duration}`])
        .videoFilters(`scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`);
    }

    command
      .outputOptions([`-r ${fps}`, "-pix_fmt yuv420p"])
      .output(outPath)
      .on("end", () => resolve(outPath))
      .on("error", (err) => reject(new Error(`FFmpeg render error: ${err.message}`)))
      .run();
  });
}

/** Concatenate multiple normalized clips into one video */
function concatClips(clips: string[], outPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const listPath = path.join(path.dirname(outPath), "concat-list.txt");
    require("fs").writeFileSync(
      listPath,
      clips.map((c) => `file '${c.replace(/'/g, "'\\''")}'`).join("\n")
    );

    ffmpeg()
      .input(listPath)
      .inputOptions(["-f concat", "-safe 0"])
      .outputOptions(["-c copy"])
      .output(outPath)
      .on("end", () => resolve(outPath))
      .on("error", (err) =>
        reject(new Error(`FFmpeg concat error: ${err.message}`))
      )
      .run();
  });
}

/** Mux an audio track onto an existing video */
function addAudio(videoPath: string, audioPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .input(audioPath)
      .outputOptions(["-map 0:v", "-map 1:a", "-c:v copy", "-c:a aac", "-shortest"])
      .output(videoPath.replace(/\.mp4$/, "-audio.mp4"))
      .on("end", () => {
        // Replace original with audio version
        require("fs").renameSync(videoPath.replace(/\.mp4$/, "-audio.mp4"), videoPath);
        resolve(videoPath);
      })
      .on("error", (err) =>
        reject(new Error(`FFmpeg audio mux error: ${err.message}`))
      )
      .run();
  });
}
