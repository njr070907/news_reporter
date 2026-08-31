import {
  chatWithMetadata,
  isLlmProviderConfigured,
  requireLlmConfig,
  type LlmGeneration,
  type LlmProvider,
} from "./llm";
import type { Article, Topic } from "./types";

export const REPORT_SYSTEM_PROMPT = `你是一名资深新闻编辑，为读者编写每日时讯简报。你只会收到一组带编号的新闻材料 [S1]…[Sn]，来自中英文媒体，每条材料包含标题，多数还包含正文节选或摘要。

硬性规则：
1. 只允许转述材料中出现的事实（标题、正文节选、摘要均在材料范围内）。禁止编造、禁止补充材料之外的信息、禁止主观推测。
2. 材料带正文时，摘要必须综合正文中的关键信息：具体数据、背景、当事人引语、影响与后续；不要停留在复述标题。
3. 把报道同一事件的多条材料聚合为一节；彼此独立的事件各成一节；按重要性排序，重要的放前面。材料过少时宁可少写，不要注水。
4. 每一节必须以一行 Markdown 二级标题开头：\`## 中文事件标题\`。标题行之后是正文，遵循三段式结构（写成自然段落，不要加粗段落标签）。节与节之间不要用分隔线：
   第一段写事件本身：谁、发生了什么、关键数据与直接结果（3~5 句）。
   第二段写背景与脉络：事件的缘起、此前相关进展、必要的历史背景。只允许使用材料中提供的内容，材料没有就整段省略，不得编造。
   第三段写声音与影响：各方表态与原话引用、不同立场的分歧、对行业或公众的影响与后续走向（2~5 句）。若本节含英文信源，在此段后另起一行用 Markdown 引用块保留一句最关键的英文原句，不翻译：
   > 英文原句 [S编号]
   节末固定一行来源标注，列出本节实际引用的全部来源，格式：
   **来源：** [S1 · 媒体名](URL) · [S4 · 媒体名](URL)
   重要事件三段写满、可到 400 字左右；次要事件至少完整写出第一段和第三段。全文应充分覆盖材料中的所有重要事件，不要为追求简短而遗漏有实质内容的事件。
5. 没有正文且标题信息量不足的孤立小消息，不要为它单开一节；可将多条此类消息合并为最后一节「## 其他动态」，每条一句话概括并标注编号。
6. 报告开头是 "## 今日要点"（单日简报）或 "## 本周要点"（多日简报，以用户消息标注的简报类型为准），给出不超过 5 条一句话 TL;DR，只挑真正重要的，每条末尾标注对应来源编号（如 [S2][S5]）。
7. 报告结尾是 "## 信源清单"，按编号逐条列出全部材料，格式：\`- [S1] 标题原文 — 媒体 · 发布时间 · URL\`。
8. 正文用简体中文写作；专有名词、机构名、产品名可保留原文。

再次强调：你的唯一职责是对给定材料做聚类与转述，任何材料中没有的信息都不得出现。`;

const LOCAL_REPORT_SYSTEM_PROMPT = `你是新闻编辑，只能根据用户提供的 [S1]…[Sn] 材料写简报，绝对不能补充材料之外的事实。

严格按以下格式输出，不要输出解释、前言、编号事件清单或分隔线：
1. 第一行必须是「## 今日要点」或「## 本周要点」，下面最多 5 条重要事件，每条一句话并在末尾写来源编号，例如 [S1][S3]。
2. 接着每个独立事件写一个「## 中文事件标题」，标题下写 2~3 个自然段：事件、材料中的背景、各方声音或影响。材料没有背景就省略，不能猜测。
3. 每个事件结尾写一行「**来源：** [S1 · 媒体名](URL)」，只列实际使用的来源。
4. 最后不要自行写「## 信源清单」；程序会根据全部材料自动补齐。
只用简体中文，严格保留材料中的数字、人物、机构和引语。`;

function fmtTime(a: Article): string {
  if (!a.publishedAt) return "时间未知";
  const utc = a.publishedAt.toISOString().replace("T", " ").slice(0, 16);
  return `${utc} UTC`;
}

function fmtBody(a: Article): string {
  if (a.content) return `正文节选：\n${a.content}`;
  if (a.snippet) return `摘要片段：${a.snippet}`;
  return "（未获取到正文，仅能依据标题）";
}

function articleUrl(a: Article): string {
  return a.finalUrl ?? a.url;
}

export function buildUserPrompt(
  topic: Topic,
  articles: Article[],
  rangeDays = 1,
): string {
  const typeLine =
    rangeDays > 1
      ? `简报类型：本周简报（覆盖过去 ${rangeDays} 天），开头标题用 "## 本周要点"`
      : "简报类型：每日简报（覆盖过去 24 小时），开头标题用 \"## 今日要点\"";
  const materials = articles
    .map(
      (a) =>
        `[${a.id}] ${a.title}\n媒体：${a.publisher} ｜ 时间：${fmtTime(a)} ｜ 语言：${a.lang}\nURL：${articleUrl(a)}\n${fmtBody(a)}`,
    )
    .join("\n\n");
  return [
    `主题：${topic.name}`,
    `中文关键词：${topic.keywordsZh.join("、") || "无"}`,
    `英文关键词：${topic.keywordsEn.join(", ") || "无"}`,
    typeLine,
    "",
    `以下是采集到的 ${articles.length} 条材料：`,
    "",
    materials,
  ].join("\n");
}

function normalizeReportMarkdown(markdown: string, articles: Article[], rangeDays: number): string {
  const overviewTitle = rangeDays > 1 ? "本周要点" : "今日要点";
  const lines = markdown
    .replace(/^\s*---\s*$/gm, "")
    .split(/\r?\n/);
  const normalized: string[] = [];
  let overviewSeen = false;
  let sourceListSeen = false;

  for (const line of lines) {
    const cleanedLine = line.replace(/^##\s+##\s+/, "## ");
    if (/^\s*##\s*信源清单\s*$/.test(cleanedLine)) {
      sourceListSeen = true;
      continue;
    }
    if (sourceListSeen) continue;

    const heading = cleanedLine.match(/^#{1,6}\s*(今日要点|本周要点)(?:\s*.*)?$/);
    if (heading) {
      if (overviewSeen) continue;
      normalized.push(`## ${overviewTitle}`);
      overviewSeen = true;
      continue;
    }
    normalized.push(cleanedLine);
  }

  const firstOverview = normalized.findIndex((line) => line.trim() === `## ${overviewTitle}`);
  if (firstOverview > 0) normalized.splice(0, firstOverview);
  if (firstOverview < 0) normalized.unshift(`## ${overviewTitle}`, "");

  const sourceById = new Map(articles.map((article) => [article.id, article]));
  const polished: string[] = [];
  let currentTitle = "";
  let currentBody = "";
  for (const line of normalized) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      currentTitle = heading[1].trim();
      currentBody = "";
      polished.push(line);
      continue;
    }
    if (/^\s*\*\*来源：\*\*/.test(line)) {
      if (currentTitle === overviewTitle) continue;
      const ids = Array.from(
        new Set(Array.from(currentBody.matchAll(/\[(S\d+)\b/g), (match) => match[1])),
      ).filter((id) => sourceById.has(id));
      if (ids.length > 0) {
        polished.push(
          `**来源：** ${ids
            .map((id) => {
              const article = sourceById.get(id)!;
              return `[${id} · ${article.publisher}](${articleUrl(article)})`;
            })
            .join(" · ")}`,
        );
      }
      continue;
    }
    currentBody += `${line}\n`;
    polished.push(line);
  }

  const sourceLines = articles.map(
    (article) => `- [${article.id}] ${article.title} — ${article.publisher} · ${fmtTime(article)} · ${articleUrl(article)}`,
  );
  return `${polished.join("\n").trim()}\n\n## 信源清单\n${sourceLines.join("\n")}`.trim();
}

function hasEventSection(markdown: string, rangeDays: number): boolean {
  const overviewTitle = rangeDays > 1 ? "本周要点" : "今日要点";
  const sections = markdown.split(/(?=^##\s+)/m);
  return sections.some((section) => {
    const heading = section.match(/^##\s+(.+)$/m)?.[1].trim();
    if (!heading || heading === overviewTitle || heading === "信源清单") return false;
    const body = section.replace(/^##\s+.+$/m, "").replace(/\s+/g, " ").trim();
    return body.length >= 80;
  });
}

function fallbackTitle(article: Article): string {
  return article.title.replace(/\s+/g, " ").trim() || "未命名事件";
}

function buildDeterministicFallbackReport(
  articles: Article[],
  rangeDays: number,
): string {
  const overviewTitle = rangeDays > 1 ? "本周要点" : "今日要点";
  const overview = articles
    .slice(0, 5)
    .map((article) => `- ${fallbackTitle(article)} [${article.id}]`)
    .join("\n");
  const sections = articles.map((article) => {
    const detail = (article.content ?? article.snippet ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1600);
    const body = detail || "材料仅提供标题，未获取到正文；本节不补充材料之外的事实。";
    return [
      `## ${fallbackTitle(article)}`,
      body,
      "",
      `**来源：** [${article.id} · ${article.publisher}](${articleUrl(article)})`,
    ].join("\n");
  });
  const sourceLines = articles.map(
    (article) =>
      `- [${article.id}] ${article.title} — ${article.publisher} · ${fmtTime(article)} · ${articleUrl(article)}`,
  );
  return [
    `## ${overviewTitle}`,
    overview || "- 暂无可提炼的头条要点",
    "",
    ...sections,
    "",
    "## 信源清单",
    sourceLines.join("\n"),
  ]
    .join("\n")
    .trim();
}

export async function generateReport(
  topic: Topic,
  articles: Article[],
  rangeDays = 1,
  options?: { provider?: LlmProvider },
): Promise<string> {
  const result = await generateReportWithMetadata(topic, articles, rangeDays, options);
  return result.markdown;
}

export async function generateReportWithMetadata(
  topic: Topic,
  articles: Article[],
  rangeDays = 1,
  options?: { provider?: LlmProvider },
): Promise<{ markdown: string; generation: LlmGeneration }> {
  const provider = requireLlmConfig(options?.provider).provider;
  const messages = [
    {
      role: "system" as const,
      content: provider === "local" ? LOCAL_REPORT_SYSTEM_PROMPT : REPORT_SYSTEM_PROMPT,
    },
    { role: "user" as const, content: buildUserPrompt(topic, articles, rangeDays) },
  ];
  const startedAt = Date.now();
  let result: Awaited<ReturnType<typeof chatWithMetadata>>;
  try {
    result = await chatWithMetadata(messages, {
      temperature: provider === "local" ? 0.1 : 0.2,
      provider,
    });
  } catch (error) {
    if (provider !== "local") throw error;
    const localModel = requireLlmConfig("local").model;
    return {
      markdown: buildDeterministicFallbackReport(articles, rangeDays),
      generation: {
        provider: "local",
        model: `${localModel} (本地兜底)`,
        generationMs: Date.now() - startedAt,
      },
    };
  }
  let markdown = normalizeReportMarkdown(result.content, articles, rangeDays);

  if (
    !hasEventSection(result.content, rangeDays) &&
    provider === "local" &&
    process.env.LLM_FALLBACK_REMOTE === "true" &&
    isLlmProviderConfigured("remote")
  ) {
    const remote = await chatWithMetadata(messages, { temperature: 0.2, provider: "remote" });
    result = {
      ...remote,
      generation: { ...remote.generation, fallbackFrom: "local" as const },
    };
    markdown = normalizeReportMarkdown(result.content, articles, rangeDays);
  }

  if (!hasEventSection(result.content, rangeDays)) {
    if (result.generation.provider === "local") {
      return {
        markdown: buildDeterministicFallbackReport(articles, rangeDays),
        generation: {
          ...result.generation,
          model: `${result.generation.model} (本地兜底)`,
        },
      };
    }
    throw new Error("LLM 返回的报告格式不完整：缺少事件级标题，请切换更强模型或启用远程 fallback");
  }
  return {
    markdown,
    generation: result.generation,
  };
}
