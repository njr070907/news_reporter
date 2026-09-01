import { chatWithMetadata, type LlmGeneration, type LlmProvider } from "./llm";

const ARTICLE_TRANSLATION_SYSTEM_PROMPT = `You translate one Chinese news briefing section into accurate, natural English.
This section summarizes an article originally published in English.

Hard rules:
1. Translate only the supplied Markdown section. Do not add facts, omit facts, or summarize further.
2. Preserve the heading, paragraph breaks, Markdown markers, source IDs such as [S1], URLs, numbers, dates, quotations, and citation links exactly. Never alter URLs or source IDs.
3. Output only the translated Markdown, with no code fence or explanation.`;

function cleanMarkdown(markdown: string): string {
  return markdown
    .replace(/^\s*```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .replace(/^# (?!#)/gm, "## ")
    .trim();
}

function sourceIds(markdown: string): string[] {
  return Array.from(new Set(markdown.match(/\[S\d+\b/g) ?? []));
}

function urls(markdown: string): string[] {
  return Array.from(new Set(markdown.match(/https?:\/\/[^\s)]+/g) ?? []));
}

function validateArticleTranslation(original: string, translated: string): void {
  if (translated.length < 80 || !/^##\s+/m.test(translated)) {
    throw new Error("英文翻译格式不完整");
  }
  for (const sid of sourceIds(original)) {
    if (!translated.includes(sid)) {
      throw new Error(`英文翻译缺少来源编号 ${sid}`);
    }
  }
  for (const url of urls(original)) {
    if (!translated.includes(url)) {
      throw new Error("英文翻译改动了来源链接");
    }
  }
}

export async function translateArticleSectionWithMetadata(
  markdown: string,
  options?: { provider?: LlmProvider },
): Promise<{ markdown: string; generation: LlmGeneration }> {
  const result = await chatWithMetadata(
    [
      { role: "system", content: ARTICLE_TRANSLATION_SYSTEM_PROMPT },
      {
        role: "user",
        content: `<article-section>\n${markdown}\n</article-section>`,
      },
    ],
    {
      provider: options?.provider ?? "local",
      temperature: 0.1,
      maxTokens: 1200,
      timeoutMs: Number.parseInt(
        process.env.LOCAL_LLM_TRANSLATION_TIMEOUT_MS ?? "180000",
        10,
      ),
      model: process.env.LOCAL_LLM_TRANSLATION_MODEL?.trim() || undefined,
    },
  );
  const translated = cleanMarkdown(result.content);
  validateArticleTranslation(markdown, translated);
  return { markdown: translated, generation: result.generation };
}
