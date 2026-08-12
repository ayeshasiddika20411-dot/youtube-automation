import { createAIProvider } from "@/lib/ai";
import type { AIProvider } from "@/lib/ai";

export interface GeneratedSeo {
  title: string;
  description: string;
  hashtags: string[];
  keywords: string[];
  tags: string[];
  thumbnail_title: string;
  pinned_comment: string;
}

const SEO_PROMPT = `You are a YouTube SEO expert. Create high-performing metadata for a video based on the script/topic provided.

Return ONLY valid JSON with this exact shape, no markdown, no code fences:
{
  "title": string,
  "description": string,
  "hashtags": string[],
  "keywords": string[],
  "tags": string[],
  "thumbnail_title": string,
  "pinned_comment": string
}

Rules:
- title: under 100 chars, click-worthy, includes primary keyword
- description: 150-250 words, includes keywords naturally, plus a CTA
- hashtags: 3-5 relevant hashtags (no # symbol)
- keywords: 5-10 high-intent keywords
- tags: 8-15 tags including variations and long-tail phrases
- thumbnail_title: short punchy text (6-8 words) for overlay
- pinned_comment: an engaging comment to pin beneath the video`;

export class SeoService {
  private provider: AIProvider;

  constructor(provider?: string) {
    this.provider = createAIProvider(provider);
  }

  async generateSeo(params: {
    topic: string;
    scriptText?: string;
    niche?: string;
  }): Promise<GeneratedSeo> {
    const prompt = `${SEO_PROMPT}

TOPIC: ${params.topic}
${params.niche ? `NICHE: ${params.niche}` : ""}
${
  params.scriptText
    ? `SCRIPT:\n${params.scriptText.slice(0, 4000)}`
    : ""
}`;

    return this.provider.generateJSON<GeneratedSeo>(prompt, {
      maxTokens: 1024,
      temperature: 0.6,
    });
  }
}
