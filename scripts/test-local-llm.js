try {
  process.loadEnvFile(".env.local");
} catch {
  // The script can still use its local defaults when .env.local is absent.
}

const testLocalLLM = async () => {
  const baseUrl = (process.env.LOCAL_LLM_BASE_URL || "http://localhost:11434/v1").replace(/\/+$/, "");
  const model = process.env.LOCAL_LLM_MODEL || "qwen3.5:0.8b";
  const startedAt = Date.now();
  const response = await fetch(`${baseUrl.replace(/\/v1$/, "")}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      model,
      system: "你是一个中文助手，必须用中文回答所有问题。",
      prompt: "请用中文写一段50字的新闻简报。",
      stream: false,
      think: false,
      options: {
        num_ctx: 4096,
        num_predict: 256,
        temperature: 0.2,
      },
    }),
    signal: AbortSignal.timeout(120000),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${data.error || "unknown error"}`);
  console.log(JSON.stringify({
    model,
    seconds: Number(((Date.now() - startedAt) / 1000).toFixed(1)),
    response: data.response || "",
  }));
};

testLocalLLM().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
