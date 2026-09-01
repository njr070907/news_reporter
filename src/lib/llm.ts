export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type LlmProvider = "local" | "remote";

export interface LlmGeneration {
  provider: LlmProvider;
  model: string;
  generationMs: number;
  fallbackFrom?: LlmProvider;
}

interface LlmConfig {
  provider: LlmProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface ChatOptions {
  temperature?: number;
  provider?: LlmProvider;
  timeoutMs?: number;
  maxTokens?: number;
  model?: string;
}

interface ChatResult {
  content: string;
  generation: LlmGeneration;
}

function getProvider(requested?: LlmProvider): LlmProvider {
  if (requested === "local" || requested === "remote") return requested;
  const provider = process.env.LLM_PROVIDER;
  if (provider === "local" || provider === "remote") return provider;
  return "remote";
}

function envInt(name: string, fallback: number, min: number, max: number): number {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

function envBool(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return fallback;
}

export function isLlmProviderConfigured(provider: LlmProvider): boolean {
  if (provider === "remote") return Boolean(process.env.LLM_API_KEY);
  return Boolean(
    process.env.LLM_PROVIDER === "local" ||
      process.env.LOCAL_LLM_ENABLED === "true",
  );
}

export function getLlmProviderOptions(): {
  activeProvider: LlmProvider;
  fallbackRemote: boolean;
  preGeneratedOnly: boolean;
  options: Array<{
    id: LlmProvider;
    label: string;
    model: string;
    available: boolean;
    description: string;
  }>;
} {
  const localModel = process.env.LOCAL_LLM_MODEL ?? "qwen3.5:4b";
  const remoteModel = process.env.LLM_MODEL ?? "deepseek-v4-flash-vision-exp";
  return {
    activeProvider: getProvider(),
    fallbackRemote: envBool("LLM_FALLBACK_REMOTE", false),
    preGeneratedOnly: envBool("REPORTS_PREGENERATED_ONLY", false),
    options: [
      {
        id: "local",
        label: "本地 Ollama",
        model: localModel,
        available: isLlmProviderConfigured("local"),
        description: "数据留在当前运行环境，适合开发和隐私场景",
      },
      {
        id: "remote",
        label: "云端 LLM",
        model: remoteModel,
        available: isLlmProviderConfigured("remote"),
        description: "响应更稳定，适合生产环境",
      },
    ],
  };
}

export function requireLlmConfig(requested?: LlmProvider): LlmConfig {
  const provider = getProvider(requested);

  if (provider === "local") {
    const baseUrl = (process.env.LOCAL_LLM_BASE_URL ?? "http://localhost:11434/v1").replace(
      /\/+$/,
      "",
    );
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

function stripThinking(content: string): string {
  return content
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/Thinking\.\.\.[\s\S]*?(?=\r?\n\r?\n|$)/gi, "")
    .trim();
}

function localPrompt(messages: ChatMessage[]): { system: string; prompt: string } {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const prompt = messages
    .filter((message) => message.role !== "system")
    .map((message) =>
      message.role === "user" ? message.content : `此前助手回复：\n${message.content}`,
    )
    .join("\n\n");
  return { system, prompt };
}

async function callLocal(
  messages: ChatMessage[],
  config: LlmConfig,
  opts: ChatOptions,
): Promise<string> {
  const { system, prompt } = localPrompt(messages);
  const timeoutMs = opts.timeoutMs ?? envInt("LOCAL_LLM_TIMEOUT_MS", 180000, 10000, 600000);
  const numCtx = envInt("LOCAL_LLM_NUM_CTX", 16384, 2048, 65536);
  const numPredict = opts.maxTokens ?? envInt("LOCAL_LLM_NUM_PREDICT", 2800, 256, 12000);
  const think = envBool("LOCAL_LLM_THINK", false);
  const res = await fetch(`${config.baseUrl.replace(/\/v1$/, "")}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      model: config.model,
      system: system || undefined,
      prompt,
      stream: false,
      think,
      keep_alive: "10m",
      options: {
        num_ctx: numCtx,
        num_predict: numPredict,
        repeat_penalty: 1.1,
        temperature: opts.temperature ?? 0.3,
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`本地 LLM 请求失败 HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = (await res.json()) as { response?: string; error?: string };
  if (data.error) throw new Error(`本地 LLM 返回错误：${data.error}`);
  const content = stripThinking(data.response ?? "");
  if (!content) throw new Error("本地 LLM 返回内容为空");
  return content;
}

async function callRemote(
  messages: ChatMessage[],
  config: LlmConfig,
  opts: ChatOptions,
): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? envInt("LLM_TIMEOUT_MS", 300000, 10000, 600000);
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: opts.temperature ?? 0.3,
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`远程 LLM 请求失败 HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("远程 LLM 返回内容为空");
  return content;
}

export async function chatWithMetadata(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<ChatResult> {
  const provider = getProvider(opts.provider);
  const config = requireLlmConfig(provider);
  const configForCall = opts.model?.trim()
    ? { ...config, model: opts.model.trim() }
    : config;
  const startedAt = Date.now();

  try {
    const content =
      provider === "local"
        ? await callLocal(messages, configForCall, opts)
        : await callRemote(messages, configForCall, opts);
    return {
      content,
      generation: {
        provider,
        model: configForCall.model,
        generationMs: Date.now() - startedAt,
      },
    };
  } catch (localError) {
    const canFallback =
      provider === "local" &&
      envBool("LLM_FALLBACK_REMOTE", false) &&
      isLlmProviderConfigured("remote");
    if (!canFallback) throw localError;

    const remote = requireLlmConfig("remote");
    try {
      const content = await callRemote(messages, remote, opts);
      return {
        content,
        generation: {
          provider: "remote",
          model: remote.model,
          generationMs: Date.now() - startedAt,
          fallbackFrom: "local",
        },
      };
    } catch (remoteError) {
      const localMessage = localError instanceof Error ? localError.message : String(localError);
      const remoteMessage = remoteError instanceof Error ? remoteError.message : String(remoteError);
      throw new Error(`本地 LLM 失败：${localMessage}；远程 fallback 也失败：${remoteMessage}`);
    }
  }
}

export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
  const result = await chatWithMetadata(messages, opts);
  return result.content;
}
