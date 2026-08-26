export type Lang = "zh" | "en";

export interface Article {
  id: string;
  title: string;
  url: string;
  publisher: string;
  publishedAt: Date | null;
  lang: Lang;
  snippet?: string;
  content?: string;
  finalUrl?: string;
}

export interface Topic {
  name: string;
  keywordsZh: string[];
  keywordsEn: string[];
}

export interface CollectResult {
  articles: Article[];
  errors: string[];
}

export interface ReportSource {
  sid: string;
  title: string;
  url: string;
  publisher: string;
  publishedAt: string | null;
  lang: Lang;
}
