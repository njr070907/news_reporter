import { loadEnvFile } from "../src/lib/env";
import { chat } from "../src/lib/llm";

loadEnvFile();

async function main(): Promise<void> {
  const start = Date.now();
  console.log("Base URL:", process.env.LLM_BASE_URL ?? "https://api.deepseek.com");
  console.log("Model:", process.env.LLM_MODEL ?? "(default)");
  console.log("Key:", process.env.LLM_API_KEY ? `已填写（长度 ${process.env.LLM_API_KEY.length}）` : "未填写！");
  const reply = await chat([{ role: "user", content: "只回复两个字：正常" }]);
  console.log(`回复：${reply}`);
  console.log(`耗时 ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
