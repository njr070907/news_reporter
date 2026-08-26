import { collectArticles } from "./collect";
import { enrichArticles } from "./enrich";
import { generateReport } from "./report";
import type { ReportSource, Topic } from "./types";

export class NoArticlesError extends Error {
  constructor() {
    super("今日没有采集到相关文章");
  }
}

export interface PipelineResult {
  markdown: string;
  sources: ReportSource[];
}

export async function runPipeline(topic: Topic): Promise<PipelineResult> {
  const { articles } = await collectArticles(topic);
  if (articles.length === 0) throw new NoArticlesError();
  await enrichArticles(articles);
  const markdown = await generateReport(topic, articles);
  const sources: ReportSource[] = articles.map((a) => ({
    sid: a.id,
    title: a.title,
    url: a.finalUrl ?? a.url,
    publisher: a.publisher,
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
    lang: a.lang,
  }));
  return { markdown, sources };
}
