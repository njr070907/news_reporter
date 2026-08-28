const testLocalLLM = async () => {
  const response = await fetch("http://localhost:11434/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      model: "qwen3.5:4b",
      messages: [
        {
          role: "system",
          content: "你是一个中文助手，必须用中文回答所有问题。",
        },
        {
          role: "user",
          content: "请用中文写一段50字的新闻简报",
        },
      ],
      temperature: 0.3,
    }),
  });

  const data = await response.json();
  console.log("Response:", data.choices?.[0]?.message?.content);
};

testLocalLLM().catch(console.error);

