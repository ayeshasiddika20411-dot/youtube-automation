// ============================================================
// AI Provider interface — pluggable text-generation providers
// ============================================================

export interface GenerateOptions {
  /** Max tokens to generate */
  maxTokens?: number;
  /** Sampling temperature (0–1) */
  temperature?: number;
  /** System prompt (provider-specific) */
  systemPrompt?: string;
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIProvider {
  readonly name: string;
  /** Generate a completion given a prompt */
  generate(prompt: string, opts?: GenerateOptions): Promise<string>;
  /** Generate a structured JSON response from a prompt */
  generateJSON<T>(prompt: string, opts?: GenerateOptions): Promise<T>;
  /** Chat-style completion */
  chat(messages: Message[], opts?: GenerateOptions): Promise<string>;
}

/** Resolve the configured AI provider from settings/env */
export function resolveProviderName(settingsProvider?: string): string {
  const fromEnv = process.env.AI_PROVIDER;
  const selected = settingsProvider || fromEnv || "gemini";
  return selected.toLowerCase();
}
