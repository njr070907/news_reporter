export interface PresetTopic {
  name: string;
  keywordsZh: string[];
  keywordsEn: string[];
}

export const PRESET_TOPICS: PresetTopic[] = [
  {
    name: "AI 与大模型",
    keywordsZh: ["人工智能", "大模型", "生成式AI"],
    keywordsEn: ["artificial intelligence", "LLM"],
  },
  {
    name: "国际局势",
    keywordsZh: ["国际局势", "地缘政治"],
    keywordsEn: ["geopolitics", "international relations"],
  },
  {
    name: "财经市场",
    keywordsZh: ["股市", "宏观经济"],
    keywordsEn: ["stock market", "economy"],
  },
  {
    name: "科技与互联网",
    keywordsZh: ["科技行业", "互联网"],
    keywordsEn: ["technology industry", "consumer tech"],
  },
  {
    name: "创业与投资",
    keywordsZh: ["风险投资", "创业公司"],
    keywordsEn: ["venture capital", "startups funding"],
  },
  {
    name: "科学与航天",
    keywordsZh: ["航天", "科学发现"],
    keywordsEn: ["space exploration", "science discovery"],
  },
  {
    name: "中国经济",
    keywordsZh: ["中国经济", "经济政策"],
    keywordsEn: ["China economy"],
  },
  {
    name: "能源与气候",
    keywordsZh: ["新能源", "气候变化"],
    keywordsEn: ["renewable energy", "climate change"],
  },
];
