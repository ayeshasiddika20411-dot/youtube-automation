import { describe, it, expect } from "vitest";
import {
  formatSrtTimestamp,
  splitIntoCues,
  generateSrt,
  type WordTimestamp,
} from "@/lib/subtitles/srtGenerator";

describe("formatSrtTimestamp", () => {
  it("formats zero", () => {
    expect(formatSrtTimestamp(0)).toBe("00:00:00,000");
  });

  it("formats hours, minutes, seconds, millis", () => {
    // 1h 2m 3s 456ms
    expect(formatSrtTimestamp(3723456)).toBe("01:02:03,456");
  });

  it("pads millis to 3 digits", () => {
    expect(formatSrtTimestamp(1500)).toBe("00:00:01,500");
    expect(formatSrtTimestamp(1001)).toBe("00:00:01,001");
  });
});

describe("splitIntoCues", () => {
  it("returns empty array for empty/whitespace text", () => {
    expect(splitIntoCues("")).toEqual([]);
    expect(splitIntoCues("   ")).toEqual([]);
  });

  it("splits long text into multiple cues respecting maxCharsPerLine", () => {
    const text = "The quick brown fox jumps over the lazy dog";
    const cues = splitIntoCues(text, 20);
    expect(cues.length).toBeGreaterThan(1);
    // Every cue text must not exceed the budget (plus one word boundary)
    for (const cue of cues) {
      expect(cue.text.length).toBeLessThanOrEqual(20 + 1);
    }
    // All words are preserved in order
    const joined = cues.map((c) => c.text).join(" ");
    expect(joined.split(/\s+/)).toEqual(text.split(/\s+/));
  });

  it("assigns sequential 1-based indexes", () => {
    const cues = splitIntoCues("one two three four five", 5);
    cues.forEach((c, i) => expect(c.index).toBe(i + 1));
  });

  it("uses word timestamps when provided", () => {
    const words = ["hello", "world"];
    const timestamps: WordTimestamp[] = [
      { word: "hello", startMs: 0, endMs: 400 },
      { word: "world", startMs: 400, endMs: 800 },
    ];
    const cues = splitIntoCues("hello world", 42, timestamps);
    expect(cues).toHaveLength(1);
    expect(cues[0].startMs).toBe(0);
    expect(cues[0].endMs).toBe(800);
    expect(cues[0].text).toBe("hello world");
  });
});

describe("generateSrt", () => {
  it("produces a valid SRT block", () => {
    const srt = generateSrt("Hello world");
    expect(srt).toContain("1\n00:00:00,000 --> ");
    expect(srt).toContain("Hello world");
    expect(srt).toMatch(/\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/);
  });

  it("numbers cues sequentially", () => {
    const srt = generateSrt(
      "one two three four five six seven eight nine ten",
      { maxCharsPerLine: 10 }
    );
    const blocks = srt.split("\n\n");
    blocks.pop(); // trailing
    blocks.forEach((b, i) => {
      expect(b.startsWith(`${i + 1}\n`)).toBe(true);
    });
  });
});
