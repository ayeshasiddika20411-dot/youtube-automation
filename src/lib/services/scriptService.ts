import { createAIProvider } from "@/lib/ai";
import type { AIProvider } from "@/lib/ai";

export interface GeneratedScript {
  hook: string;
  introduction: string;
  main_content: string;
  ending: string;
  cta: string;
  language: string;
  style: string;
  length_seconds: number;
}

const SCRIPT_PROMPT = `You are a professional YouTube scriptwriter. Write a complete, engaging video script for the topic below.

Return ONLY valid JSON with this exact shape, no markdown, no code fences:
{
  "hook": string,
  "introduction": string,
  "main_content": string,
  "ending": string,
  "cta": string,
  "language": string,
  "style": string,
  "length_seconds": number
}

Rules:
- hook: 1-2 punchy opening sentences (captures attention in first 3 seconds)
- introduction: 2-3 sentences introducing what the video covers
- main_content: the bulk — detailed, structured, informative body (aim for roughly the target duration)
- ending: 2-3 sentences wrapping up key takeaways
- cta: a call-to-action (subscribe, comment, like)
- Estimate length_seconds based on ~150 words per minute
- Keep the tone conversational and engaging for YouTube`;

export class ScriptService {
  private provider: AIProvider;

  constructor(provider?: string) {
    this.provider = createAIProvider(provider);
  }

  async generateScript(topic: string, opts: {
    language?: string;
    style?: string;
    targetDuration?: number;
    niche?: string;
  } = {}): Promise<GeneratedScript> {
    const prompt = `${SCRIPT_PROMPT}

TOPIC: ${topic}
${opts.niche ? `NICHE: ${opts.niche}` : ""}
${opts.language ? `LANGUAGE: ${opts.language}` : ""}
${opts.style ? `STYLE: ${opts.style}` : ""}
${opts.targetDuration ? `TARGET DURATION (seconds): ${opts.targetDuration}` : ""}`;

    return this.provider.generateJSON<GeneratedScript>(prompt, {
      maxTokens: 2048,
      temperature: 0.7,
    });
  }
}
