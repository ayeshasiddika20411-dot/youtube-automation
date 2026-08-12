import { describe, it, expect, vi, beforeEach } from "vitest";

const generateJSONMock = vi.fn();
const capturedPrompts: string[] = [];

// Mock the AI module so SeoService doesn't hit real providers.
vi.mock("@/lib/ai", () => ({
  createAIProvider: () => ({
    name: "mocked",
    async generate() {
      return "";
    },
    async generateJSON<T>(prompt: string) {
      capturedPrompts.push(prompt);
      return (await generateJSONMock()) as T;
    },
    async chat() {
      return "";
    },
  }),
}));

import { SeoService } from "@/lib/services/seoService";

describe("SeoService", () => {
  beforeEach(() => {
    generateJSONMock.mockReset();
    capturedPrompts.length = 0;
  });

  it("returns the generated SEO payload from the provider", async () => {
    generateJSONMock.mockResolvedValue({
      title: "Test Title",
      description: "A description with keywords.",
      hashtags: ["a", "b"],
      keywords: ["kw1", "kw2"],
      tags: ["t1", "t2"],
      thumbnail_title: "Punchy",
      pinned_comment: "Let me know!",
    });

    const service = new SeoService("gemini");
    const seo = await service.generateSeo({ topic: "test" });

    expect(seo.title).toBe("Test Title");
    expect(Array.isArray(seo.hashtags)).toBe(true);
    expect(Array.isArray(seo.keywords)).toBe(true);
    expect(Array.isArray(seo.tags)).toBe(true);
    expect(seo.thumbnail_title).toBe("Punchy");
    expect(seo.pinned_comment).toBeTruthy();
  });

  it("includes the topic in the prompt", async () => {
    generateJSONMock.mockResolvedValue({
      title: "X",
      description: "desc",
      hashtags: [],
      keywords: [],
      tags: [],
      thumbnail_title: "t",
      pinned_comment: "c",
    });
    const service = new SeoService("gemini");
    await service.generateSeo({ topic: "My interesting topic" });

    expect(capturedPrompts.length).toBe(1);
    expect(capturedPrompts[0]).toContain("My interesting topic");
  });
});
