import { collectArticles } from "./collect";
import { enrichArticles } from "./enrich";
import { generateReportWithMetadata } from "./report";
import type { LlmProvider } from "./llm";
import type { ReportSource, Topic } from "./types";

export class NoArticlesError extends Error {
  constructor() {
    super("没有采集到相关文章");
  }
}

export interface PipelineResult {
  markdown: string;
  sources: ReportSource[];
  generation: {
    provider: LlmProvider;
    model: string;
    generationMs: number;
    fallbackFrom?: LlmProvider;
  };
}

export async function runPipeline(
  topic: Topic,
  rangeDays = 1,
  options?: { provider?: LlmProvider },
): Promise<PipelineResult> {
  const { articles } = await collectArticles(topic, rangeDays);
  if (articles.length === 0) throw new NoArticlesError();
  await enrichArticles(articles);
  const generated = await generateReportWithMetadata(topic, articles, rangeDays, options);
  const sources: ReportSource[] = articles.map((a) => ({
    sid: a.id,
    title: a.title,
    url: a.finalUrl ?? a.url,
    publisher: a.publisher,
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
    lang: a.lang,
    imageUrl: a.imageUrl ?? null,
  }));
  return { markdown: generated.markdown, sources, generation: generated.generation };
}
