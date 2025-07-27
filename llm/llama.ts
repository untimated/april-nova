const endpoint = "http://localhost:11434/api/generate";

const prompt = `You are April. Talk casually.

User: hello April
April:`;

export async function generateWithLlama(prompt: string): Promise<string> {

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3",
      prompt: prompt,
      stream: false,
    }),
  });

  const data: any = await res.json();
  return data.response ?? "…";
}
