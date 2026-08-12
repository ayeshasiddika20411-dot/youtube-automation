import type { StockMediaProvider } from "./provider";
import { resolveStockProviderName } from "./provider";
import { PexelsProvider } from "./pexels";
import { PixabayProvider } from "./pixabay";

/** Create a stock media provider instance based on the configured name */
export function createStockMediaProvider(
  settingsProvider?: string
): StockMediaProvider {
  const name = resolveStockProviderName(settingsProvider);
  switch (name) {
    case "pixabay":
      return new PixabayProvider();
    case "pexels":
    default:
      return new PexelsProvider();
  }
}

export { PexelsProvider } from "./pexels";
export { PixabayProvider } from "./pixabay";
export type {
  StockMediaProvider,
  StockMediaSearchResult,
  SearchOptions,
} from "./provider";
export { resolveStockProviderName } from "./provider";
