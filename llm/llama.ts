import type { LLMReplyResult } from "../types";
import { estimateCost } from "./cost";

const endpoint = "http://localhost:11434/api/generate";

export async function generateWithLlama(prompt: string): Promise<LLMReplyResult> {
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
    const reply = data.response ?? "…";

    const tokens_input = Math.ceil(prompt.length / 4);
    const tokens_output = Math.ceil(reply.length / 4);

    return {
        reply,
        tokens_input,
        tokens_output,
        model: "llama",
        cost_usd: estimateCost("llama", tokens_input, tokens_output),
    };
}
