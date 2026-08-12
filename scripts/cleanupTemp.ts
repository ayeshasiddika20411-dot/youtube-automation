/**
 * cleanupTemp
 * -----------
 * Optional maintenance script to prune stale local temp files produced by
 * the pipeline stages (downloaded stock media, generated audio, rendered
 * videos, word-timestamp JSON). In production these live on the worker's
 * ephemeral disk (GitHub Actions) so cleanup is mostly relevant for local dev.
 *
 * Run: npm run cleanup
 */
import { rmSync } from "node:fs";
import { join } from "node:path";

const TMP_DIR = process.env.TEMP_DIR ?? join(process.cwd(), ".pipeline-tmp");
const STALE_MS = Number(process.env.CLEANUP_MAX_AGE_MS ?? 1000 * 60 * 60 * 24); // 24h

export function cleanup(dir = TMP_DIR, staleMs = STALE_MS): number {
  let removed = 0;
  try {
    const { existsSync, readdirSync, statSync } = require("node:fs");
    const { resolve } = require("node:path");
    if (!existsSync(dir)) return 0;
    const now = Date.now();
    for (const name of readdirSync(dir)) {
      const full = resolve(dir, name);
      try {
        const st = statSync(full);
        if (st.isFile() && now - st.mtimeMs > staleMs) {
          rmSync(full, { force: true });
          removed++;
        } else if (st.isDirectory()) {
          removed += cleanup(full, staleMs);
        }
      } catch {
        // skip unreadable entries
      }
    }
  } catch (err) {
    console.error("cleanup error:", (err as Error).message);
  }
  return removed;
}

if (require.main === module) {
  const removed = cleanup();
  console.log(`[cleanup] removed ${removed} stale temp file(s) from ${TMP_DIR}`);
}

