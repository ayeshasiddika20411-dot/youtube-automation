import type { createServiceClient } from "@/lib/supabase/server";

type LogLevel = "info" | "warn" | "error" | "debug";

/**
 * Central logger. Writes to the system_logs table when a service client is
 * provided, otherwise falls back to console output (useful in local dev / worker).
 */
class Logger {
  private client: ReturnType<typeof createServiceClient> | null = null;

  setClient(client: ReturnType<typeof createServiceClient> | null) {
    this.client = client;
  }

  async log(
    message: string,
    opts?: {
      level?: LogLevel;
      jobId?: string | null;
      context?: Record<string, unknown>;
      durationMs?: number;
    }
  ) {
    const level = opts?.level ?? "info";
    const entry = {
      job_id: opts?.jobId ?? null,
      level,
      message,
      context: opts?.context ?? {},
      duration_ms: opts?.durationMs ?? null,
    };

    // Always console-log so worker/API logs are visible
    if (level === "error") console.error(`[${level}]`, message, entry.context);
    else if (level === "warn") console.warn(`[${level}]`, message, entry.context);
    else console.log(`[${level}]`, message, entry.context);

// Persist to DB if a service client is available
    if (this.client) {
      try {
        await this.client.from("system_logs").insert(entry as never);
      } catch (err) {
        console.error("Failed to persist log entry:", err);
      }
    }
  }

  info(message: string, opts?: Omit<Parameters<Logger["log"]>[1], "level">) {
    return this.log(message, { ...opts, level: "info" });
  }

  warn(message: string, opts?: Omit<Parameters<Logger["log"]>[1], "level">) {
    return this.log(message, { ...opts, level: "warn" });
  }

  error(message: string, opts?: Omit<Parameters<Logger["log"]>[1], "level">) {
    return this.log(message, { ...opts, level: "error" });
  }

  debug(message: string, opts?: Omit<Parameters<Logger["log"]>[1], "level">) {
    return this.log(message, { ...opts, level: "debug" });
  }
}

export const logger = new Logger();
