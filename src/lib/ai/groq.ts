import type { AIProvider, GenerateOptions, Message } from "./provider";
import { withRetry } from "@/lib/utils/retry";

const GROQ_API_BASE = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

function getApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error("Missing GROQ_API_KEY environment variable.");
  }
  return key;
}

interface GroqResponse {
  choices?: { message?: { content?: string } }[];
}

/** Groq provider (OpenAI-compatible REST) */
export class GroqProvider implements AIProvider {
  readonly name = "groq";
  private model: string;

  constructor(model = process.env.GROQ_MODEL || DEFAULT_MODEL) {
    this.model = model;
  }

  private async request(
    messages: Message[],
    opts: GenerateOptions = {}
  ): Promise<string> {
    const key = getApiKey();
    const url = `${GROQ_API_BASE}/chat/completions`;

    const body = {
      model: this.model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 2048,
    };

    const res = await withRetry(
      async () => {
        const r = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify(body),
        });
        if (!r.ok) {
          const text = await r.text();
          throw new Error(`Groq API error (${r.status}): ${text}`);
        }
        return r;
      },
      { attempts: 3, baseDelayMs: 1000 }
    );

    const data = (await res.json()) as GroqResponse;
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("Groq returned an empty response.");
    }
    return text;
  }

  async generate(prompt: string, opts?: GenerateOptions): Promise<string> {
    const messages: Message[] = opts?.systemPrompt
      ? [
          { role: "system", content: opts.systemPrompt },
          { role: "user", content: prompt },
        ]
      : [{ role: "user", content: prompt }];
    return this.request(messages, opts);
  }

  async generateJSON<T>(prompt: string, opts?: GenerateOptions): Promise<T> {
    const p = prompt.includes("{")
      ? prompt
      : `${prompt}\n\nReturn a valid JSON object only.`;
    const raw = await this.generate(p, opts);
    const json = raw.replace(/```json|```/g, "").trim();
    const start = json.indexOf("{");
    const end = json.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new Error("Groq did not return valid JSON.");
    }
    return JSON.parse(json.slice(start, end + 1)) as T;
  }

  async chat(messages: Message[], opts?: GenerateOptions): Promise<string> {
    return this.request(messages, opts);
  }
}
