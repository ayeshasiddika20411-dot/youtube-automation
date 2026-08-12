import { createReadStream, createWriteStream } from "fs";
import { mkdtemp } from "fs/promises";
import os from "os";
import path from "path";
import { google } from "googleapis";
import { createOAuth2Client } from "./client";

export interface YouTubeUploadOptions {
  title: string;
  description: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus?: "public" | "unlisted" | "private";
  madeForKids?: boolean;
  playlistId?: string;
  /** ISO language code, e.g. "en" */
  language?: string;
  /** Path to thumbnail image */
  thumbnailPath?: string;
}

export interface YouTubeUploadResult {
  videoId: string;
  url: string;
  title: string;
}

/**
 * Upload a video to YouTube using the resumable upload protocol.
 * The refresh token is used to authorize the upload.
 */
export async function uploadToYouTube(
  videoPath: string,
  refreshToken: string,
  opts: YouTubeUploadOptions
): Promise<YouTubeUploadResult> {
  const client = createOAuth2Client(refreshToken);
  const youtube = google.youtube({ version: "v3", auth: client });

  const metadata = {
    snippet: {
      title: opts.title,
      description: opts.description,
      tags: opts.tags ?? [],
      categoryId: opts.categoryId ?? "22", // default: People & Blogs
      defaultLanguage: opts.language,
    },
    status: {
      privacyStatus: opts.privacyStatus ?? "private",
      selfDeclaredMadeForKids: opts.madeForKids ?? false,
    },
  };

  // Resumable upload
  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: metadata,
    media: {
      body: createReadStream(videoPath),
    },
  });

  const videoId = res.data.id;
  if (!videoId) {
    throw new Error("YouTube upload did not return a video ID.");
  }

  // Optional thumbnail upload
  if (opts.thumbnailPath) {
    await youtube.thumbnails.set({
      videoId,
      media: {
        body: createReadStream(opts.thumbnailPath),
      },
    });
  }

  // Add to playlist if requested
  if (opts.playlistId) {
    await youtube.playlistItems.insert({
      part: ["snippet"],
      requestBody: {
        snippet: {
          playlistId: opts.playlistId,
          resourceId: {
            kind: "youtube#video",
            videoId,
          },
        },
      },
    });
  }

  return {
    videoId,
    url: `https://youtu.be/${videoId}`,
    title: opts.title,
  };
}

/** Helper to stage a thumbnail file to a temp path (used by pipeline) */
export async function stageThumbnail(
  bytes: Buffer,
  filename = "thumbnail.jpg"
): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "yt-thumb-"));
  const filePath = path.join(dir, filename);
  await new Promise<void>((resolve, reject) => {
    const ws = createWriteStream(filePath);
    ws.write(bytes);
    ws.end(() => resolve());
    ws.on("error", reject);
  });
  return filePath;
}
