import * as cheerio from "cheerio";
import type { Article } from "./types";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const MAX_CONTENT_CHARS = 2400;

export interface EnrichStats {
  total: number;
  ok: number;
  failed: number;
  decoded: number;
}

function isGoogleLink(url: string): boolean {
  return /^https?:\/\/news\.google\.com\/rss\/articles\//.test(url);
}

export async function decodeGoogleNewsUrl(
  articleUrl: string,
): Promise<string | null> {
  const m = articleUrl.match(/\/rss\/articles\/([^?/]+)/);
  if (!m) return null;
  const id = m[1];

  try {
    const pageRes = await fetch(`https://news.google.com/rss/articles/${id}`, {
      headers: { "User-Agent": UA },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!pageRes.ok) return null;
    const html = await pageRes.text();
    const sg = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
    const ts = html.match(/data-n-a-ts="([^"]+)"/)?.[1];
    if (!sg || !ts) return null;

    const rpcInner = JSON.stringify([
      "garturlreq",
      [
        ["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1],
        "X",
        "X",
        1,
        [1, 1, 1],
        1,
        1,
        null,
        0,
        0,
        null,
        0,
      ],
      id,
      Number(ts),
      sg,
    ]);
    const body = `f.req=${encodeURIComponent(
      JSON.stringify([[["Fbv4je", rpcInner, null, "generic"]]]),
    )}`;

    const apiRes = await fetch("https://news.google.com/_/DotsSplashUi/data/batchexecute", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": UA,
        Referer: "https://news.google.com/",
      },
      body,
      signal: AbortSignal.timeout(15000),
    });
    if (!apiRes.ok) return null;
    const text = await apiRes.text();
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("[")) continue;
      let envelopes: unknown[];
      try {
        envelopes = JSON.parse(trimmed) as unknown[];
      } catch {
        continue;
      }
      if (!Array.isArray(envelopes)) continue;
      for (const env of envelopes) {
        if (
          !Array.isArray(env) ||
          env[0] !== "wrb.fr" ||
          env[1] !== "Fbv4je" ||
          typeof env[2] !== "string"
        ) {
          continue;
        }
        try {
          const payload = JSON.parse(env[2]) as unknown[];
          if (payload?.[0] === "garturlres" && typeof payload[1] === "string") {
            return payload[1];
          }
        } catch {
          continue;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

function extractText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, nav, header, footer, aside, form, iframe, svg").remove();
  let root = $("article").first();
  if (root.length === 0) {
    root = $('[itemprop="articleBody"], [class*="article-body"], [class*="story-body"]').first();
  }
  let paragraphs = root.find("p");
  if (paragraphs.length === 0) {
    paragraphs = $("main p").length > 0 ? $("main p") : $("body p");
  }
  const chunks: string[] = [];
  paragraphs.each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t.length > 30) chunks.push(t);
  });
  const text = chunks.join("\n");
  if (!text || text.length < 120) return "";
  return text.slice(0, MAX_CONTENT_CHARS);
}

async function fetchContent(a: Article): Promise<boolean> {
  try {
    const res = await fetch(a.finalUrl ?? a.url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language":
          a.lang === "zh" ? "zh-CN,zh;q=0.9,en;q=0.8" : "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return false;
    if ((a.finalUrl ?? a.url) !== res.url) a.finalUrl = res.url;
    const text = extractText(await res.text());
    if (!text) return false;
    a.content = text;
    return true;
  } catch {
    return false;
  }
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  async function worker(): Promise<void> {
    while (index < items.length) {
      const item = items[index++];
      await fn(item);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
}

export async function enrichArticles(
  articles: Article[],
  concurrency = 6,
): Promise<EnrichStats> {
  const googleLinked = articles.filter((a) => isGoogleLink(a.url));

  let decodedCount = 0;
  await mapPool(googleLinked, 4, async (a) => {
    const real = await decodeGoogleNewsUrl(a.url);
    if (real) {
      a.finalUrl = real;
      decodedCount++;
    }
  });

  let ok = 0;
  await mapPool(articles, concurrency, async (a) => {
    if (await fetchContent(a)) ok++;
  });

  return { total: articles.length, ok, failed: articles.length - ok, decoded: decodedCount };
}
