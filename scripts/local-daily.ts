import { loadEnvFile } from "../src/lib/env";
import { createLocalSyncHeaders } from "../src/lib/local-sync";
import { runPipeline, NoArticlesError, type PipelineResult } from "../src/lib/pipeline";
import { translateReportWithMetadata } from "../src/lib/translation";

interface SyncTopic {
  id: string;
  name: string;
  keywordsZh: string[];
  keywordsEn: string[];
}

interface TopicsResponse {
  date: string;
  topics: SyncTopic[];
  missingTopicIds?: string[];
  missingTranslationTopicIds?: string[];
  error?: string;
}

interface SyncReport {
  id: string;
  topicId: string;
  date: string;
  markdown: string;
}

interface TranslationResult {
  markdown: string;
  generation: {
    provider: "local" | "remote";
    model: string;
    generationMs: number;
  };
}

async function jsonResponse<T>(res: Response): Promise<T> {
  const raw = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`网站返回了无法解析的响应（HTTP ${res.status}）`);
  }
  if (!res.ok) {
    const error = (data as { error?: string }).error;
    throw new Error(error ?? `网站请求失败（HTTP ${res.status}）`);
  }
  return data as T;
}

function baseUrl(): string {
  const value = process.env.LOCAL_SYNC_BASE_URL?.trim();
  if (!value) {
    throw new Error("缺少 LOCAL_SYNC_BASE_URL：请配置网站地址");
  }
  return value.replace(/\/+$/, "");
}

function topicSignature(topic: SyncTopic): string {
  return JSON.stringify({
    name: topic.name.trim().toLowerCase(),
    keywordsZh: [...topic.keywordsZh].map((keyword) => keyword.trim().toLowerCase()).sort(),
    keywordsEn: [...topic.keywordsEn].map((keyword) => keyword.trim().toLowerCase()).sort(),
  });
}

async function uploadReport(
  site: string,
  secret: string,
  topic: SyncTopic,
  date: string,
  result: PipelineResult,
): Promise<string> {
  const payload = JSON.stringify({
    topicId: topic.id,
    date,
    rangeDays: 1,
    markdown: result.markdown,
    sources: result.sources,
    llmProvider: result.generation.provider,
    llmModel: result.generation.model,
    generationMs: result.generation.generationMs,
  });
  const upload = await fetch(`${site}/api/local-sync/reports`, {
    method: "POST",
    headers: createLocalSyncHeaders(payload, secret),
    body: payload,
    signal: AbortSignal.timeout(30_000),
  });
  const data = await jsonResponse<{ reportId: string }>(upload);
  return data.reportId;
}

async function fetchReport(
  site: string,
  secret: string,
  topicId: string,
  date: string,
): Promise<SyncReport> {
  const params = new URLSearchParams({ topicId, date, rangeDays: "1" });
  const response = await fetch(`${site}/api/local-sync/reports?${params.toString()}`, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(30_000),
  });
  const data = await jsonResponse<{ report: SyncReport }>(response);
  return data.report;
}

async function uploadTranslation(
  site: string,
  secret: string,
  reportId: string,
  translated: TranslationResult,
): Promise<void> {
  const payload = JSON.stringify({
    reportId,
    language: "en",
    markdown: translated.markdown,
    llmProvider: translated.generation.provider,
    llmModel: translated.generation.model,
    generationMs: translated.generation.generationMs,
  });
  const upload = await fetch(`${site}/api/local-sync/translations`, {
    method: "POST",
    headers: createLocalSyncHeaders(payload, secret),
    body: payload,
    signal: AbortSignal.timeout(30_000),
  });
  await jsonResponse<{ translationId: string }>(upload);
}

async function main(): Promise<void> {
  loadEnvFile();
  const site = baseUrl();
  const secret = process.env.LOCAL_SYNC_SECRET?.trim();
  if (!secret) throw new Error("缺少 LOCAL_SYNC_SECRET：请配置本地报告同步密钥");

  const dryRun = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force");
  const response = await fetch(`${site}/api/local-sync/topics`, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(30_000),
  });
  const data = await jsonResponse<TopicsResponse>(response);
  const reportIdsToGenerate = new Set(
    force
      ? data.topics.map((topic) => topic.id)
      : (data.missingTopicIds ?? data.topics.map((topic) => topic.id)),
  );
  const translationIdsToGenerate = new Set(
    force ? data.topics.map((topic) => topic.id) : (data.missingTranslationTopicIds ?? []),
  );
  const pendingIds = new Set([
    ...reportIdsToGenerate,
    ...translationIdsToGenerate,
  ]);
  const topics = data.topics.filter((topic) => pendingIds.has(topic.id));
  console.log(
    `目标日期：${data.date} · 活跃主题：${data.topics.length} · 待处理：${topics.length}`,
  );
  if (topics.length === 0) {
    console.log("今天的报告和英文版已全部准备，跳过重复生成");
    return;
  }
  if (dryRun) console.log("试运行模式：不会上传报告或英文版");

  let reportsUploaded = 0;
  let translationsUploaded = 0;
  let failed = 0;
  const groups = new Map<string, SyncTopic[]>();
  for (const topic of topics) {
    const group = groups.get(topicSignature(topic)) ?? [];
    group.push(topic);
    groups.set(topicSignature(topic), group);
  }

  const reportCache = new Map<string, Promise<SyncReport>>();
  const translationCache = new Map<string, Promise<TranslationResult>>();
  const getCachedReport = (topicId: string, date: string): Promise<SyncReport> => {
    const cached = reportCache.get(topicId);
    if (cached) return cached;
    const pending = fetchReport(site, secret, topicId, date);
    reportCache.set(topicId, pending);
    return pending;
  };
  const getCachedTranslation = (markdown: string): Promise<TranslationResult> => {
    const cached = translationCache.get(markdown);
    if (cached) return cached;
    const pending = translateReportWithMetadata(markdown, { provider: "local" });
    translationCache.set(markdown, pending);
    return pending;
  };

  for (const group of groups.values()) {
    const topic = group[0];
    const startedAt = Date.now();
    const reportIds = new Map<string, string>();
    const reportMarkdown = new Map<string, string>();
    const reportTargets = group.filter((item) => reportIdsToGenerate.has(item.id));
    const translationTargets = group.filter((item) =>
      translationIdsToGenerate.has(item.id) || reportIdsToGenerate.has(item.id),
    );
    let pipelineResult: PipelineResult | null = null;

    console.log(
      `开始：${topic.name}${group.length > 1 ? `（${group.length} 个用户）` : ""}`,
    );
    try {
      if (reportTargets.length > 0) {
        pipelineResult = await runPipeline(
          {
            name: topic.name,
            keywordsZh: topic.keywordsZh,
            keywordsEn: topic.keywordsEn,
          },
          1,
          { provider: "local" },
        );
      }
    } catch (err) {
      failed += reportTargets.length;
      const message =
        err instanceof NoArticlesError
          ? "没有采集到相关文章"
          : err instanceof Error
            ? err.message
            : String(err);
      console.error(`失败：${topic.name} · ${message}`);
      continue;
    }

    if (pipelineResult && !dryRun) {
      const uploads = await Promise.allSettled(
        reportTargets.map(async (item) => ({
          topicId: item.id,
          reportId: await uploadReport(site, secret, item, data.date, pipelineResult!),
        })),
      );
      uploads.forEach((upload, index) => {
        const item = reportTargets[index];
        if (upload.status === "fulfilled") {
          reportIds.set(item.id, upload.value.reportId);
          reportMarkdown.set(item.id, pipelineResult!.markdown);
          reportsUploaded += 1;
        } else {
          failed += 1;
          console.error(
            `报告上传失败：${item.name} · ${
              upload.reason instanceof Error ? upload.reason.message : String(upload.reason)
            }`,
          );
        }
      });
    } else if (pipelineResult) {
      for (const item of reportTargets) reportMarkdown.set(item.id, pipelineResult.markdown);
    }

    if (!dryRun) {
      for (const item of translationTargets) {
        try {
          if (reportIdsToGenerate.has(item.id) && !reportIds.has(item.id)) {
            continue;
          }
          let reportId = reportIds.get(item.id);
          let markdown = reportMarkdown.get(item.id);
          if (!reportId || !markdown) {
            const existing = await getCachedReport(item.id, data.date);
            reportId = existing.id;
            markdown = existing.markdown;
          }
          const translated = await getCachedTranslation(markdown);
          await uploadTranslation(site, secret, reportId, translated);
          translationsUploaded += 1;
        } catch (err) {
          failed += 1;
          console.error(
            `英文版处理失败：${item.name} · ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }
    }

    console.log(
      `完成：${topic.name} · ${Math.round((Date.now() - startedAt) / 1000)}s · ${
        dryRun ? "试运行" : `报告 ${reportIds.size} · 英文版 ${translationTargets.length}`
      }`,
    );
  }

  console.log(
    `任务结束：报告上传 ${reportsUploaded}，英文版上传 ${translationsUploaded}，失败 ${failed}`,
  );
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
