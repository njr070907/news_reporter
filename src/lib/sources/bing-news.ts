import { XMLParser } from "fast-xml-parser";
import type { Article, Lang } from "../types";

const parser = new XMLParser({
  removeNSPrefix: true,
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

interface FeedItem {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  image?: string;
  source?: { "#text"?: string } | string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

function buildUrl(query: string, lang: Lang): string {
  const q = encodeURIComponent(query);
  return lang === "zh"
    ? `https://www.bing.com/news/search?q=${q}&format=RSS&setmkt=zh-CN&setlang=zh-Hans`
    : `https://www.bing.com/news/search?q=${q}&format=RSS&setmkt=en-US&setlang=en`;
}

export async function fetchBingNews(query: string, lang: Lang): Promise<Article[]> {
  const res = await fetch(buildUrl(query, lang), {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) news-reporter/0.1" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Bing News HTTP ${res.status}`);
  const xml = await res.text();
  const doc = parser.parse(xml) as { rss?: { channel?: { item?: FeedItem | FeedItem[] } } };
  const raw = doc.rss?.channel?.item;
  const items = raw ? (Array.isArray(raw) ? raw : [raw]) : [];
  const out: Article[] = [];
  for (const item of items.slice(0, 30)) {
    if (!item.title || !item.link) continue;
    const s = item.source;
    const publisher =
      typeof s === "string" ? s : (s?.["#text"]?.trim() ?? "Bing News");
    const published = item.pubDate ? new Date(item.pubDate) : null;
    out.push({
      id: "",
      title: item.title.trim(),
      url: item.link.trim(),
      publisher,
      publishedAt: published && !Number.isNaN(published.getTime()) ? published : null,
      lang,
      snippet: item.description ? stripHtml(item.description) : undefined,
      imageUrl:
        typeof item.image === "string" && item.image.startsWith("http")
          ? item.image
          : undefined,
    });
  }
  return out;
}
