// ============================================================
// SRT subtitle generator — pure logic, unit-testable
// ============================================================

export interface WordTimestamp {
  word: string;
  startMs: number;
  endMs: number;
}

export interface SubtitleCue {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
}

/** Format milliseconds as SRT timestamp (HH:MM:SS,mmm) */
export function formatSrtTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.round(ms % 1000);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
}

/**
 * Split narration text into subtitle cues based on a max characters-per-line
 * budget, grouping whole words. Optionally align to word timestamps if provided.
 */
export function splitIntoCues(
  text: string,
  maxCharsPerLine = 42,
  wordTimestamps?: WordTimestamp[]
): SubtitleCue[] {
  const words = text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.trim());

  if (words.length === 0) return [];

  const cues: SubtitleCue[] = [];
  let current: string[] = [];
  let currentLen = 0;

  const hasTimings = wordTimestamps && wordTimestamps.length === words.length;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const nextLen = currentLen + (currentLen > 0 ? 1 : 0) + word.length;

    if (nextLen > maxCharsPerLine && current.length > 0) {
      // flush current line
      const startIdx = i - current.length;
      const lineWords = current;
      cues.push({
        index: cues.length + 1,
        startMs: hasTimings ? wordTimestamps![startIdx].startMs : cueStartDefault(cues),
        endMs: hasTimings
          ? wordTimestamps![startIdx + lineWords.length - 1].endMs
          : cueEndDefault(cues, lineWords, text),
        text: lineWords.join(" "),
      });
      current = [word];
      currentLen = word.length;
    } else {
      current.push(word);
      currentLen = nextLen;
    }
  }

  // flush remaining
  if (current.length > 0) {
    const startIdx = words.length - current.length;
    cues.push({
      index: cues.length + 1,
      startMs: hasTimings ? wordTimestamps![startIdx].startMs : cueStartDefault(cues),
      endMs: hasTimings
        ? wordTimestamps![words.length - 1].endMs
        : cueEndDefault(cues, current, text),
      text: current.join(" "),
    });
  }

  return cues;
}

function cueStartDefault(cues: SubtitleCue[]): number {
  return cues.length === 0 ? 0 : cues[cues.length - 1].endMs;
}

function cueEndDefault(
  cues: SubtitleCue[],
  lineWords: string[],
  totalText: string
): number {
  const start = cueStartDefault(cues);
  const totalWords = totalText.trim().split(/\s+/).filter(Boolean).length;
  // Heuristic: 2.5 words/sec
  const duration = (lineWords.length / 2.5) * 1000;
  return start + Math.round(duration);
}

/**
 * Generate full SRT file content from either plain text or word timestamps.
 */
export function generateSrt(
  text: string,
  opts: { maxCharsPerLine?: number; wordTimestamps?: WordTimestamp[] } = {}
): string {
  const cues = splitIntoCues(
    text,
    opts.maxCharsPerLine ?? 42,
    opts.wordTimestamps
  );
  return cues
    .map(
      (c) =>
        `${c.index}\n${formatSrtTimestamp(c.startMs)} --> ${formatSrtTimestamp(
          c.endMs
        )}\n${c.text}\n`
    )
    .join("\n");
}
