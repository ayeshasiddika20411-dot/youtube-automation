import { createAIProvider } from "@/lib/ai";
import type { AIProvider } from "@/lib/ai";

export interface PlannedScene {
  scene_index: number;
  narration: string;
  search_keywords: string[];
  duration: number;
  transition: string;
}

const SCENE_PROMPT = `You are a video scene planner and editor. Break the script below into visual scenes for a stock-footage-driven YouTube video.

Return ONLY valid JSON with this exact shape, no markdown, no code fences:
{
  "scenes": [
    {
      "scene_index": number,
      "narration": string,
      "search_keywords": string[],
      "duration": number,
      "transition": string
    }
  ]
}

Rules:
- Split the narration into logical scenes (6-12 typically)
- Each scene's "narration" is the exact voiceover text for that segment
- "search_keywords": 3-6 keywords for stock media search (specific, visual descriptors)
- "duration": seconds for that scene (proportional to narration length, ~2.5 words/sec)
- "transition": one of ["cut", "fade", "wipe", "zoom"]
- Keep total duration roughly matching the target`;

export class ScenePlannerService {
  private provider: AIProvider;

  constructor(provider?: string) {
    this.provider = createAIProvider(provider);
  }

  async planScenes(params: {
    scriptText: string;
    targetDuration?: number;
  }): Promise<PlannedScene[]> {
    const prompt = `${SCENE_PROMPT}

TARGET DURATION (seconds): ${params.targetDuration ?? 60}

SCRIPT:
${params.scriptText.slice(0, 6000)}`;

    const result = await this.provider.generateJSON<{ scenes: PlannedScene[] }>(
      prompt,
      { maxTokens: 2048, temperature: 0.5 }
    );

    return (result.scenes ?? []).map((s, i) => ({
      ...s,
      scene_index: s.scene_index ?? i,
    }));
  }
}

/**
 * Local deterministic fallback: split a script into scenes without AI.
 * Used in tests and as a fallback when the AI is unavailable.
 */
export function splitIntoScenes(
  scriptText: string,
  opts: { targetDuration?: number; maxScenes?: number } = {}
): PlannedScene[] {
  const maxScenes = opts.maxScenes ?? 8;
  const targetDuration = opts.targetDuration ?? 60;
  const paragraphs = scriptText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const scenes: PlannedScene[] = [];
  const numScenes = Math.min(paragraphs.length, maxScenes);

  for (let i = 0; i < numScenes; i++) {
    const narration = paragraphs[i];
    const words = narration.split(/\s+/).filter(Boolean).length;
    const duration = Math.max(
      3,
      Math.round((words / 2.5) * 10) / 10
    );
    scenes.push({
      scene_index: i,
      narration,
      search_keywords: extractKeywords(narration),
      duration,
      transition: i % 3 === 0 ? "fade" : i % 3 === 1 ? "wipe" : "cut",
    });
  }

  return scenes;
}

/** Extract simple keywords from a narration line (stop-word filtered) */
export function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "if", "then", "this", "that",
    "with", "for", "you", "your", "is", "are", "was", "were", "to", "of",
    "in", "on", "at", "by", "from", "as", "it", "its", "we", "our", "they",
    "them", "so", "just", "really", "very", "about", "into", "their", "there",
  ]);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/);
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const w of words) {
    if (stopWords.has(w) || w.length < 4) continue;
    if (!seen.has(w)) {
      seen.add(w);
      keywords.push(w);
    }
    if (keywords.length >= 6) break;
  }
  return keywords.length > 0 ? keywords : ["overview"];
}
