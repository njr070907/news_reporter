const testLocalLLM = async () => {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      model: "qwen3.5:0.8b",
      prompt: "请用中文写一段50字的新闻简报",
      stream: false,
      options: {
        num_ctx: 32768,
        repeat_penalty: 1.1,
        temperature: 0.3,
      },
    }),
  });

  const data = await response.json();
  console.log("Response:", data.response);
};

testLocalLLM().catch(console.error);
