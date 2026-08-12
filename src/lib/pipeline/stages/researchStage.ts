import { createAIProvider } from "@/lib/ai";
import type { StageModule } from "../types";
import { logger } from "@/lib/services/logger";

/**
 * Research stage: gather facts/angle for the topic using the AI provider.
 * Stores research notes in the job context (light stage — runs in API route).
 */
export const researchStage: StageModule = {
  name: "research",
  mode: "light",
  async run(ctx) {
    const provider = createAIProvider(ctx.provider);
    const prompt = `Research the topic "${ctx.topic}" for a YouTube video. Provide:
1. 5-8 key factual points or statistics
2. A unique angle or hook
3. 3 common misconceptions or questions people have
Return as concise bullet points.`;

    try {
      const research = await provider.generate(prompt, { maxTokens: 800 });
      // Store research in job context (could move to a dedicated table)
      // For now, just log and return success — the script stage re-queries as needed.
      await logger.info(`Research done for job ${ctx.jobId}`, { jobId: ctx.jobId });
      return {
        status: "success",
        data: { research },
        message: "Research completed",
      };
    } catch (err) {
      await logger.error(`Research failed for job ${ctx.jobId}: ${(err as Error).message}`, { jobId: ctx.jobId });
      throw err;
    }
  },
};
