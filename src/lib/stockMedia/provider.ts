// ============================================================
// Stock Media provider interface — pluggable stock footage/image
// ============================================================

export interface StockMediaSearchResult {
  provider: string;
  /** Direct URL to download the media file */
  url: string;
  /** Preview/thumbnail URL */
  previewUrl: string;
  width: number;
  height: number;
  /** MIME type if known */
  format?: string;
  /** License attribution text */
  licenseInfo: string;
  /** Optional fallback flag if this was a fallback match */
  fallback?: boolean;
}

export interface StockMediaProvider {
  readonly name: string;
  /** Search for stock media matching a query */
  search(query: string, opts?: SearchOptions): Promise<StockMediaSearchResult[]>;
  /** Download a media file to a local path */
  download(result: StockMediaSearchResult, destPath: string): Promise<string>;
}

export interface SearchOptions {
  /** Number of results to return */
  count?: number;
  /** Media type preference: "video" | "image" | "any" */
  type?: "video" | "image" | "any";
  /** Orientation hint */
  orientation?: "landscape" | "portrait" | "square";
}

/** Resolve the configured stock media provider name */
export function resolveStockProviderName(settingsProvider?: string): string {
  const fromEnv = process.env.STOCK_MEDIA_PROVIDER;
  return (settingsProvider || fromEnv || "pexels").toLowerCase();
}
