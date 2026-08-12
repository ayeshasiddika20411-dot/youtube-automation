import type { AIProvider } from "./provider";
import { resolveProviderName } from "./provider";
import { GeminiProvider } from "./gemini";
import { GroqProvider } from "./groq";

/** Create an AI provider instance based on the configured name */
export function createAIProvider(settingsProvider?: string): AIProvider {
  const name = resolveProviderName(settingsProvider);
  switch (name) {
    case "groq":
      return new GroqProvider();
    case "gemini":
    default:
      return new GeminiProvider();
  }
}

export { GeminiProvider } from "./gemini";
export { GroqProvider } from "./groq";
export type { AIProvider, GenerateOptions, Message } from "./provider";
export { resolveProviderName } from "./provider";
