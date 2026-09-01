import type { ReportSource } from "./types";

export interface ReportSection {
  title: string;
  body: string;
}

export function splitReportSections(markdown: string): ReportSection[] {
  const lines = markdown.split(/\r?\n/);
  const sections: ReportSection[] = [];
  let current: ReportSection | null = null;
  const rest: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current) sections.push(current);
      current = { title: line.slice(3).trim(), body: "" };
    } else if (current) {
      current.body += line + "\n";
    } else {
      rest.push(line);
    }
  }
  if (current) sections.push(current);
  if (rest.length > 0 && rest.join("").trim()) {
    sections.unshift({ title: "", body: rest.join("\n") });
  }
  return sections;
}

function citedSourceIds(section: ReportSection): string[] {
  return Array.from(
    new Set(
      Array.from(
        `${section.title}\n${section.body}`.matchAll(/\[(S\d+)\b/g),
        (match) => match[1],
      ),
    ),
  );
}

export function getEnglishSectionIndexes(
  markdown: string,
  sources: ReportSource[],
): number[] {
  const bySid = new Map(sources.map((source) => [source.sid, source]));
  return splitReportSections(markdown)
    .map((section, index) => {
      if (
        !section.title ||
        section.title === "今日要点" ||
        section.title === "本周要点" ||
        section.title === "信源清单"
      ) {
        return null;
      }
      const cited = citedSourceIds(section);
      if (cited.length === 0) return null;
      return cited.every((sid) => bySid.get(sid)?.lang === "en") ? index : null;
    })
    .filter((index): index is number => index !== null);
}

export function sectionMarkdown(section: ReportSection): string {
  return [`## ${section.title}`, section.body.trim()].filter(Boolean).join("\n\n").trim();
}
