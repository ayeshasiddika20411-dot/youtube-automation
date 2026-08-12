import { writeFile } from "fs/promises";
import { withRetry } from "@/lib/utils/retry";
import type {
  StockMediaProvider,
  StockMediaSearchResult,
  SearchOptions,
} from "./provider";

const PEXELS_API = "https://api.pexels.com";

function getApiKey(): string {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error("Missing PEXELS_API_KEY environment variable.");
  return key;
}

interface PexelsVideoFile {
  id: number;
  quality: "hd" | "sd" | "hls" | "uhd";
  file_type: string;
  width: number;
  height: number;
  link: string;
}

interface PexelsVideo {
  id: number;
  url: string;
  image: string;
  width: number;
  height: number;
  duration: number;
  video_files: PexelsVideoFile[];
}

interface PexelsResponse {
  videos?: PexelsVideo[];
  total_results?: number;
}

/** Pexels stock video provider (free, key-based) */
export class PexelsProvider implements StockMediaProvider {
  readonly name = "pexels";

  async search(
    query: string,
    opts: SearchOptions = {}
  ): Promise<StockMediaSearchResult[]> {
    const key = getApiKey();
    const type = opts.type ?? "video";
    const perPage = opts.count ?? 5;
    const orientation = opts.orientation ?? "landscape";
    const limit = opts.count ?? 5;

    const endpoint = type === "image" ? "search" : "videos/search";
    const params = new URLSearchParams({
      query,
      per_page: String(perPage),
      orientation,
    });

    const res = await withRetry(
      async () => {
        const r = await fetch(`${PEXELS_API}/${endpoint}?${params}`, {
          headers: { Authorization: key },
        });
        if (r.status === 401) throw new Error("Invalid Pexels API key (401).");
        if (!r.ok) throw new Error(`Pexels error (${r.status})`);
        return r.json();
      },
      { attempts: 3, baseDelayMs: 1000 }
    );

    const data = res as PexelsResponse;

    if (type === "image") {
      const images = (
        data as unknown as {
          photos?: {
            src: { original: string; landscape: string };
            width: number;
            height: number;
            photographer: string;
          }[];
        }
      ).photos ?? [];
      return images.slice(0, limit).map((p, i) => ({
        provider: this.name,
        url: p.src.original,
        previewUrl: p.src.landscape,
        width: p.width,
        height: p.height,
        format: "image/jpeg",
        licenseInfo: `Photo by ${p.photographer} via Pexels`,
        fallback: i >= (opts.count ?? 5) - 1,
      }));
    }

    // Video results
    const videos = data.videos ?? [];
    return videos.slice(0, limit).map((v, i) => {
      // Prefer HD file
      const file =
        v.video_files.find((f) => f.quality === "hd") ??
        v.video_files[v.video_files.length - 1];
      return {
        provider: this.name,
        url: file?.link ?? v.url,
        previewUrl: v.image,
        width: file?.width ?? v.width,
        height: file?.height ?? v.height,
        format: file?.file_type ?? "video/mp4",
        licenseInfo: `From Pexels (free to use)`,
        fallback: i >= (opts.count ?? 5) - 1,
      };
    });
  }

  async download(
    result: StockMediaSearchResult,
    destPath: string
  ): Promise<string> {
    const arrayBuf = await withRetry(
      async () => {
        const r = await fetch(result.url);
        if (!r.ok) throw new Error(`Download failed (${r.status})`);
        return r.arrayBuffer();
      },
      { attempts: 3, baseDelayMs: 2000 }
    );
    await writeFile(destPath, Buffer.from(arrayBuf));
    return destPath;
  }
}
