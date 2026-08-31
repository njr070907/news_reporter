import { loadEnvFile } from "../src/lib/env";
import { createLocalSyncHeaders } from "../src/lib/local-sync";
import { runPipeline, NoArticlesError } from "../src/lib/pipeline";

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
  error?: string;
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
  const pendingIds = new Set(
    force
      ? data.topics.map((topic) => topic.id)
      : (data.missingTopicIds ?? data.topics.map((topic) => topic.id)),
  );
  const topics = data.topics.filter((topic) => pendingIds.has(topic.id));
  console.log(
    `目标日期：${data.date} · 活跃主题：${data.topics.length} · 待处理：${topics.length}`,
  );
  if (topics.length === 0) {
    console.log("今天的报告已全部准备，跳过重复生成");
    return;
  }
  if (dryRun) console.log("试运行模式：不会上传报告");

  let generated = 0;
  let failed = 0;
  const groups = new Map<string, SyncTopic[]>();
  for (const topic of topics) {
    const group = groups.get(topicSignature(topic)) ?? [];
    group.push(topic);
    groups.set(topicSignature(topic), group);
  }

  for (const group of groups.values()) {
    const topic = group[0];
    const startedAt = Date.now();
    let uploadFailureCount = 0;
    try {
      console.log(`开始：${topic.name}${group.length > 1 ? `（${group.length} 个用户）` : ""}`);
      const result = await runPipeline(
        {
          name: topic.name,
          keywordsZh: topic.keywordsZh,
          keywordsEn: topic.keywordsEn,
        },
        1,
        { provider: "local" },
      );

      if (!dryRun) {
        const uploads = await Promise.allSettled(
          group.map(async (item) => {
            const payload = JSON.stringify({
              topicId: item.id,
              date: data.date,
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
            await jsonResponse<{ reportId: string }>(upload);
          }),
        );
        const uploadFailures = uploads.filter((upload) => upload.status === "rejected");
        uploadFailureCount = uploadFailures.length;
        generated += uploads.length - uploadFailureCount;
        failed += uploadFailureCount;
        if (uploadFailureCount > 0) {
          const firstFailure = uploadFailures[0];
          throw firstFailure.reason instanceof Error
            ? firstFailure.reason
            : new Error(String(firstFailure.reason));
        }
      } else {
        generated += group.length;
      }
      console.log(
        `完成：${topic.name} · ${Math.round((Date.now() - startedAt) / 1000)}s · ${
          dryRun ? "未上传" : "已上传"
        }`,
      );
    } catch (err) {
      if (uploadFailureCount === 0) failed += group.length;
      const message =
        err instanceof NoArticlesError
          ? "没有采集到相关文章"
          : err instanceof Error
            ? err.message
            : String(err);
      console.error(`失败：${topic.name} · ${message}`);
    }
  }

  console.log(`任务结束：成功 ${generated}，失败 ${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
