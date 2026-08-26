export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function requireLlmConfig(): LlmConfig {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error(
      "缺少 LLM_API_KEY：请打开项目根目录的 .env.local，填入你的 DeepSeek API Key 后重试（该文件已被 .gitignore 忽略，不会提交到仓库）。",
    );
  }
  return {
    apiKey,
    baseUrl: (process.env.LLM_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, ""),
    model: process.env.LLM_MODEL ?? "deepseek-v4-flash-vision-exp",
  };
}

export async function chat(
  messages: ChatMessage[],
  opts?: { temperature?: number },
): Promise<string> {
  const { apiKey, baseUrl, model } = requireLlmConfig();
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts?.temperature ?? 0.3,
    }),
    signal: AbortSignal.timeout(300000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LLM 请求失败 HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM 返回内容为空");
  return content;
}
