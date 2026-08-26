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
  source?: { "@_url"?: string; "#text"?: string } | string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

function buildUrl(query: string, lang: Lang, days: number): string {
  const q = encodeURIComponent(`${query} when:${days}d`);
  return lang === "zh"
    ? `https://news.google.com/rss/search?q=${q}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`
    : `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
}

export async function fetchGoogleNews(
  query: string,
  lang: Lang,
  days = 1,
): Promise<Article[]> {
  const res = await fetch(buildUrl(query, lang, days), {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) news-reporter/0.1" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Google News HTTP ${res.status}`);
  const xml = await res.text();
  const doc = parser.parse(xml) as { rss?: { channel?: { item?: FeedItem | FeedItem[] } } };
  const raw = doc.rss?.channel?.item;
  const items = raw ? (Array.isArray(raw) ? raw : [raw]) : [];
  const out: Article[] = [];
  for (const item of items.slice(0, 12)) {
    if (!item.title || !item.link) continue;
    const sep = item.title.lastIndexOf(" - ");
    let title = item.title.trim();
    let publisher = "";
    if (sep > 20) {
      publisher = item.title.slice(sep + 3).trim();
      title = item.title.slice(0, sep).trim();
    }
    if (!publisher) {
      const s = item.source;
      publisher = typeof s === "string" ? s : (s?.["#text"] ?? "Unknown");
    }
    const published = item.pubDate ? new Date(item.pubDate) : null;
    out.push({
      id: "",
      title,
      url: item.link,
      publisher,
      publishedAt: published && !Number.isNaN(published.getTime()) ? published : null,
      lang,
      snippet: item.description ? stripHtml(item.description) : undefined,
    });
  }
  return out;
}
