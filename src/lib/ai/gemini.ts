import type { AIProvider, GenerateOptions, Message } from "./provider";
import { withRetry } from "@/lib/utils/retry";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-1.5-flash";

function getApiKey(): string {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) {
    throw new Error(
      "Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable."
    );
  }
  return key;
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
  }[];
}

/** Google Gemini provider (REST via generativelanguage.googleapis.com) */
export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private model: string;

  constructor(model = process.env.GEMINI_MODEL || DEFAULT_MODEL) {
    this.model = model;
  }

  private async request(
    contents: { role: string; parts: { text: string }[] }[],
    opts: GenerateOptions = {}
  ): Promise<string> {
    const key = getApiKey();
    const url = `${GEMINI_API_BASE}/models/${this.model}:generateContent?key=${key}`;

    const systemInstruction = opts.systemPrompt
      ? {
          system_instruction: {
            parts: [{ text: opts.systemPrompt }],
          },
        }
      : {};

    const body = {
      ...systemInstruction,
      contents,
      generationConfig: {
        temperature: opts.temperature ?? 0.7,
        maxOutputTokens: opts.maxTokens ?? 2048,
      },
    };

    const res = await withRetry(
      async () => {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) {
          const text = await r.text();
          throw new Error(`Gemini API error (${r.status}): ${text}`);
        }
        return r;
      },
      { attempts: 3, baseDelayMs: 1000 }
    );

    const data = (await res.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("");
    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }
    return text;
  }

  async generate(prompt: string, opts?: GenerateOptions): Promise<string> {
    return this.request([{ role: "user", parts: [{ text: prompt }] }], opts);
  }

  async generateJSON<T>(prompt: string, opts?: GenerateOptions): Promise<T> {
    const cleaned = prompt.includes("{")
      ? prompt
      : `${prompt}\n\nReturn a valid JSON object only.`;
    const raw = await this.generate(cleaned, opts);
    // Strip markdown code fences if present
    const json = raw.replace(/```json|```/g, "").trim();
    const start = json.indexOf("{");
    const end = json.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new Error("Gemini did not return valid JSON.");
    }
    return JSON.parse(json.slice(start, end + 1)) as T;
  }

  async chat(messages: Message[], opts?: GenerateOptions): Promise<string> {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    return this.request(contents, opts);
  }
}
