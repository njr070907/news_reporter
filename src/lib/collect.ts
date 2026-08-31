import type { Article, CollectResult, Topic } from "./types";
import { fetchGoogleNews } from "./sources/google-news";
import { fetchBingNews } from "./sources/bing-news";

export const MAX_ARTICLES = 40;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedCollectResult {
  expiresAt: number;
  articles: Article[];
  errors: string[];
}

const g = globalThis as unknown as {
  __nrCollectCache?: Map<string, CachedCollectResult>;
};

function cache(): Map<string, CachedCollectResult> {
  if (!g.__nrCollectCache) g.__nrCollectCache = new Map();
  return g.__nrCollectCache;
}

function cacheTtl(): number {
  const value = Number.parseInt(process.env.COLLECT_CACHE_TTL_MS ?? "", 10);
  if (!Number.isFinite(value)) return DEFAULT_CACHE_TTL_MS;
  return Math.min(Math.max(value, 0), 60 * 60 * 1000);
}

function cloneArticle(article: Article): Article {
  return {
    ...article,
    publishedAt: article.publishedAt ? new Date(article.publishedAt) : null,
  };
}

function cacheKey(topic: Topic, days: number): string {
  return JSON.stringify({
    days,
    zh: [...topic.keywordsZh].map((k) => k.trim().toLowerCase()).sort(),
    en: [...topic.keywordsEn].map((k) => k.trim().toLowerCase()).sort(),
  });
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.search = "";
    u.hash = "";
    return `${u.host.replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return url.toLowerCase();
  }
}

function titleKey(title: string): string {
  return title.toLowerCase().replace(/[\W_]+/gu, "").slice(0, 48);
}

export async function collectArticles(
  topic: Topic,
  days = 1,
): Promise<CollectResult> {
  const key = cacheKey(topic, days);
  const cached = cache().get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      articles: cached.articles.map(cloneArticle),
      errors: [...cached.errors],
    };
  }
  if (cached) cache().delete(key);

  const jobs: Array<{ label: string; run: () => Promise<Article[]> }> = [];
  for (const kw of topic.keywordsZh) {
    jobs.push({
      label: `google-zh「${kw}」`,
      run: () => fetchGoogleNews(kw, "zh", days),
    });
    jobs.push({ label: `bing-zh「${kw}」`, run: () => fetchBingNews(kw, "zh") });
  }
  for (const kw of topic.keywordsEn) {
    jobs.push({
      label: `google-en "${kw}"`,
      run: () => fetchGoogleNews(kw, "en", days),
    });
    jobs.push({ label: `bing-en "${kw}"`, run: () => fetchBingNews(kw, "en") });
  }

  const settled = await Promise.allSettled(jobs.map((j) => j.run()));
  const errors: string[] = [];
  const merged: Article[] = [];
  const seenUrl = new Set<string>();
  const seenTitle = new Set<string>();

  settled.forEach((r, i) => {
    if (r.status === "rejected") {
      errors.push(`${jobs[i].label}: ${String(r.reason?.message ?? r.reason)}`);
      return;
    }
    for (const a of r.value) {
      const nu = normalizeUrl(a.url);
      const tk = titleKey(a.title);
      if (seenUrl.has(nu) || seenTitle.has(tk)) continue;
      seenUrl.add(nu);
      seenTitle.add(tk);
      merged.push(a);
    }
  });

  merged.sort(
    (a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
  );
  if (merged.length > MAX_ARTICLES) merged.length = MAX_ARTICLES;
  merged.forEach((a, i) => {
    a.id = `S${i + 1}`;
  });
  cache().set(key, {
    expiresAt: Date.now() + cacheTtl(),
    articles: merged.map(cloneArticle),
    errors: [...errors],
  });
  return { articles: merged, errors };
}
