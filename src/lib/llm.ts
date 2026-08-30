export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

type LlmProvider = "local" | "remote";

interface LlmConfig {
  provider: LlmProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
}

function getProvider(): LlmProvider {
  const provider = process.env.LLM_PROVIDER;
  if (provider === "local" || provider === "remote") return provider;
  return "remote";
}

export function requireLlmConfig(): LlmConfig {
  const provider = getProvider();

  if (provider === "local") {
    const baseUrl = (process.env.LOCAL_LLM_BASE_URL ?? "http://localhost:11434/v1").replace(/\/+$/, "");
    const model = process.env.LOCAL_LLM_MODEL ?? "qwen3.5:4b";
    return { provider: "local", apiKey: "ollama", baseUrl, model };
  }

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error(
      "缺少 LLM_API_KEY：请打开项目根目录的 .env.local，填入你的 DeepSeek API Key 后重试。",
    );
  }
  return {
    provider: "remote",
    apiKey,
    baseUrl: (process.env.LLM_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, ""),
    model: process.env.LLM_MODEL ?? "deepseek-v4-flash-vision-exp",
  };
}

export async function chat(
  messages: ChatMessage[],
  opts?: { temperature?: number },
): Promise<string> {
  const { provider, apiKey, baseUrl, model } = requireLlmConfig();

  if (provider === "local") {
    const prompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
    const res = await fetch(`${baseUrl.replace("/v1", "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          num_ctx: 32768,
          repeat_penalty: 1.1,
          temperature: opts?.temperature ?? 0.3,
        },
      }),
      signal: AbortSignal.timeout(600000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`LLM 请求失败 HTTP ${res.status}: ${text.slice(0, 500)}`);
    }
    const data = (await res.json()) as { response?: string };
    const content = data.response;
    if (!content) throw new Error("LLM 返回内容为空");
    return content.replace(/Thinking\.\.\.([\s\S]*?)(?=\n\n|$)/g, "").trim();
  }

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
    signal: AbortSignal.timeout(600000),
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

