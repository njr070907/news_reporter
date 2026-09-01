import { chatWithMetadata, type LlmGeneration, type LlmProvider } from "./llm";

const TRANSLATION_SYSTEM_PROMPT = `You are a precise Chinese-to-English news editor.
Translate the supplied Markdown report into natural, professional English.

Hard rules:
1. Translate only the report between the delimiters. Do not add, remove, summarize, or interpret facts.
2. Preserve the complete Markdown structure, including every heading, bullet, blockquote, bold marker, source ID such as [S1], URL, number, date, and citation link. Never translate or alter URLs.
3. Translate Chinese headings, prose, source titles, and labels; keep proper nouns in their standard English form when obvious.
4. Output only the translated Markdown. Do not wrap it in a code fence or add an explanation.`;

function cleanMarkdown(markdown: string): string {
  return markdown
    .replace(/^\s*```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

function sourceIds(markdown: string): string[] {
  return Array.from(new Set(markdown.match(/\[S\d+\b/g) ?? []));
}

function urls(markdown: string): string[] {
  return Array.from(new Set(markdown.match(/https?:\/\/[^\s)]+/g) ?? []));
}

function validateTranslation(original: string, translated: string): void {
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

export async function translateReportWithMetadata(
  markdown: string,
  options?: { provider?: LlmProvider },
): Promise<{ markdown: string; generation: LlmGeneration }> {
  const result = await chatWithMetadata(
    [
      { role: "system", content: TRANSLATION_SYSTEM_PROMPT },
      {
        role: "user",
        content: `<report>\n${markdown}\n</report>`,
      },
    ],
    {
      provider: options?.provider ?? "local",
      temperature: 0.1,
      maxTokens: 6000,
      model: process.env.LOCAL_LLM_TRANSLATION_MODEL?.trim() || undefined,
    },
  );
  const translated = cleanMarkdown(result.content);
  validateTranslation(markdown, translated);
  return { markdown: translated, generation: result.generation };
}
