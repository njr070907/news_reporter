import type { Article, CollectResult, Topic } from "./types";
import { fetchGoogleNews } from "./sources/google-news";
import { fetchBingNews } from "./sources/bing-news";

export const MAX_ARTICLES = 40;

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
  return { articles: merged, errors };
}
