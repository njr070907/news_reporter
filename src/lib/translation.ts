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
    .replace(/^# (?!#)/gm, "## ")
    .trim();
}

function splitSourceList(markdown: string): { body: string; sourceList: string } {
  const sourceIndex = markdown.search(/^##\s+信源清单\s*$/m);
  if (sourceIndex < 0) return { body: markdown, sourceList: "" };
  const body = markdown.slice(0, sourceIndex).trim();
  const sourceList = markdown
    .slice(sourceIndex)
    .replace(/^##\s+信源清单\s*$/m, "## Sources")
    .trim();
  return { body, sourceList };
}

function splitTranslationChunks(markdown: string, maxChars = 2600): string[] {
  const sections = markdown.split(/(?=^##\s+)/gm).filter((section) => section.trim());
  const chunks: string[] = [];
  let current = "";
  for (const section of sections) {
    if (current && current.length + section.length + 2 > maxChars) {
      chunks.push(current.trim());
      current = "";
    }
    current = current ? `${current}\n\n${section}` : section;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [markdown];
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
  const { body, sourceList } = splitSourceList(markdown);
  const chunks = splitTranslationChunks(body);
  const translatedChunks: string[] = [];
  let generation: LlmGeneration | null = null;
  for (const chunk of chunks) {
    const result = await chatWithMetadata(
      [
        { role: "system", content: TRANSLATION_SYSTEM_PROMPT },
        {
          role: "user",
          content: `<report>\n${chunk}\n</report>`,
        },
      ],
      {
        provider: options?.provider ?? "local",
        temperature: 0.1,
        maxTokens: 1500,
        timeoutMs: Number.parseInt(process.env.LOCAL_LLM_TRANSLATION_TIMEOUT_MS ?? "900000", 10),
        model: process.env.LOCAL_LLM_TRANSLATION_MODEL?.trim() || undefined,
      },
    );
    const translatedChunk = cleanMarkdown(result.content);
    if (!/^##\s+/m.test(translatedChunk)) {
      throw new Error("英文翻译分段格式不完整");
    }
    translatedChunks.push(translatedChunk);
    if (generation) {
      const previousGeneration: LlmGeneration = generation;
      generation = {
        ...previousGeneration,
        generationMs: previousGeneration.generationMs + result.generation.generationMs,
      };
    } else {
      generation = result.generation;
    }
  }
  const translated = [translatedChunks.join("\n\n"), sourceList]
    .filter(Boolean)
    .join("\n\n");
  validateTranslation(markdown, translated);
  return { markdown: translated, generation: generation! };
}
