import { chat } from "./llm";
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

export async function generateReport(
  topic: Topic,
  articles: Article[],
  rangeDays = 1,
): Promise<string> {
  return chat(
    [
      { role: "system", content: REPORT_SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(topic, articles, rangeDays) },
    ],
    { temperature: 0.2 },
  );
}
