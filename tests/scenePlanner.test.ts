import { describe, it, expect } from "vitest";
import {
  splitIntoScenes,
  extractKeywords,
} from "@/lib/services/scenePlannerService";

describe("extractKeywords", () => {
  it("filters stop words and short words", () => {
    const keywords = extractKeywords(
      "The quick brown fox jumps over the lazy dog"
    );
    expect(keywords).not.toContain("the");
    expect(keywords).not.toContain("a");
    expect(keywords).toContain("quick");
    expect(keywords).toContain("brown");
  });

  it("returns a fallback when nothing qualifies", () => {
    expect(extractKeywords("a an the it")).toEqual(["overview"]);
  });

  it("caps at 6 keywords and de-duplicates", () => {
    const text = "alpha beta gamma delta epsilon zeta eta theta";
    const keywords = extractKeywords(text);
    expect(keywords.length).toBeLessThanOrEqual(6);
    expect(new Set(keywords).size).toBe(keywords.length);
  });
});

describe("splitIntoScenes", () => {
  it("splits paragraphs into scenes", () => {
    const script = [
      "Intro paragraph about the topic.",
      "Second paragraph diving deeper.",
      "Third paragraph with a conclusion.",
    ].join("\n\n");
    const scenes = splitIntoScenes(script, { maxScenes: 8 });
    expect(scenes.length).toBe(3);
    expect(scenes[0].scene_index).toBe(0);
    expect(scenes[0].narration).toContain("Intro");
  });

  it("respects maxScenes limit", () => {
    const paragraphs = Array.from(
      { length: 12 },
      (_, i) => `Paragraph ${i + 1} with enough words to matter.`
    );
    const scenes = splitIntoScenes(paragraphs.join("\n\n"), { maxScenes: 5 });
    expect(scenes.length).toBe(5);
  });

  it("assigns valid durations and transitions", () => {
    const scenes = splitIntoScenes(
      "Hello world this is a test scene with several words.",
      { maxScenes: 3 }
    );
    for (const scene of scenes) {
      expect(scene.duration).toBeGreaterThanOrEqual(3);
      expect(["cut", "fade", "wipe", "zoom"]).toContain(scene.transition);
      expect(Array.isArray(scene.search_keywords)).toBe(true);
    }
  });
});
