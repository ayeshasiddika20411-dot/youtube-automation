import { writeFile } from "fs/promises";
import { withRetry } from "@/lib/utils/retry";
import type {
  StockMediaProvider,
  StockMediaSearchResult,
  SearchOptions,
} from "./provider";

const PIXABAY_API_BASE = "https://pixabay.com/api";

function getApiKey(): string {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) throw new Error("Missing PIXABAY_API_KEY environment variable.");
  return key;
}

interface PixabayVideo {
  id: number;
  duration: number;
  videos: {
    large?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    thumbnail?: { url: string; width: number; height: number };
  };
  picture_id: string;
}

interface PixabayImage {
  id: number;
  webformatURL: string;
  largeImageURL: string;
  imageWidth: number;
  imageHeight: number;
  user: string;
}

interface PixabayVideoResponse {
  hits?: PixabayVideo[];
}
interface PixabayImageResponse {
  hits?: PixabayImage[];
}

/** Pixabay stock media provider (video + image) */
export class PixabayProvider implements StockMediaProvider {
  readonly name = "pixabay";

  async search(
    query: string,
    opts: SearchOptions = {}
  ): Promise<StockMediaSearchResult[]> {
    const key = getApiKey();
    const type = opts.type ?? "video";
    const perPage = opts.count ?? 5;
    const orientation = opts.orientation ?? "horizontal";

    const mediaType = type === "image" ? "image" : "video";
    const params = new URLSearchParams({
      key,
      q: query,
      per_page: String(perPage),
      orientation,
      safesearch: "true",
    });

    const url = `${PIXABAY_API_BASE}/${mediaType}/?${params}`;

    const data = await withRetry(
      async () => {
        const r = await fetch(url);
        if (r.status === 401) throw new Error("Invalid Pixabay API key.");
        if (!r.ok) throw new Error(`Pixabay error (${r.status})`);
        return r.json();
      },
      { attempts: 3, baseDelayMs: 1000 }
    );

    if (type === "image") {
      const imgs = (data as PixabayImageResponse).hits ?? [];
      return imgs.map((im) => ({
        provider: this.name,
        url: im.largeImageURL,
        previewUrl: im.webformatURL,
        width: im.imageWidth,
        height: im.imageHeight,
        format: "image/jpeg",
        licenseInfo: `Image by ${im.user} via Pixabay (Pixabay License)`,
      }));
    }

    const vids = (data as PixabayVideoResponse).hits ?? [];
    return vids.map((v) => {
      const file = v.videos.large ?? v.videos.medium ?? v.videos.thumbnail;
      return {
        provider: this.name,
        url: file?.url ?? "",
        previewUrl: `https://i.vimeocdn.com/video/${v.picture_id}_640x360.jpg`,
        width: file?.width ?? 1920,
        height: file?.height ?? 1080,
        format: "video/mp4",
        licenseInfo: `From Pixabay (Pixabay License)` ,
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
