import { describe, it, expect, vi } from "vitest";
import {
  computeBackoff,
  withRetry,
  retryNTimes,
} from "@/lib/utils/retry";

describe("computeBackoff", () => {
  it("grows exponentially with attempt number", () => {
    const base = 1000;
    const factor = 2;
    // without jitter, attempt 1 = 1000, attempt 2 = 2000, attempt 3 = 4000
    // With jitter between 0.75x and 1.25x, assert it stays in that range.
    const a1 = computeBackoff(1, base, 30000, factor);
    const a2 = computeBackoff(2, base, 30000, factor);
    const a3 = computeBackoff(3, base, 30000, factor);
    expect(a1).toBeGreaterThanOrEqual(base * 0.75);
    expect(a1).toBeLessThanOrEqual(base * 1.25);
    expect(a2).toBeGreaterThanOrEqual(base * 2 * 0.75);
    expect(a2).toBeLessThanOrEqual(base * 2 * 1.25);
    expect(a3).toBeGreaterThanOrEqual(base * 4 * 0.75);
    expect(a3).toBeLessThanOrEqual(base * 4 * 1.25);
  });

  it("caps at maxDelayMs", () => {
    const a = computeBackoff(10, 1000, 5000, 2);
    expect(a).toBeLessThanOrEqual(5000);
  });
});

describe("withRetry", () => {
  it("returns the result of fn on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { attempts: 3 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries until success and returns the value", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue("recovered");
    // pass attempts=3 and tiny delay
    const result = await withRetry(fn, {
      attempts: 3,
      baseDelayMs: 1,
      maxDelayMs: 2,
    });
    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws the last error after exhausting attempts", async () => {
    const fail = vi.fn().mockRejectedValue(new Error("always fails"));
    await expect(
      withRetry(fail, { attempts: 3, baseDelayMs: 1, maxDelayMs: 2 })
    ).rejects.toThrow("always fails");
    expect(fail).toHaveBeenCalledTimes(3);
  });

  it("respects shouldRetry returning false", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("nope"));
    await expect(
      withRetry(fn, {
        attempts: 5,
        baseDelayMs: 1,
        maxDelayMs: 2,
        shouldRetry: () => false,
      })
    ).rejects.toThrow("nope");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("calls onRetry with attempt info", async () => {
    const onRetry = vi.fn();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("x"))
      .mockResolvedValue("done");
    await withRetry(fn, {
      attempts: 3,
      baseDelayMs: 1,
      maxDelayMs: 2,
      onRetry,
    });
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry.mock.calls[0][1]).toBe(1); // attempt number
  });
});

describe("retryNTimes", () => {
  it("retries exactly N times then rethrows", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fail"));
    await expect(retryNTimes(fn, 2)).rejects.toThrow("fail");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
