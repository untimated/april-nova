import { GEMINI_API_KEY } from "../config/env";
import type { GeminiError , GeminiResponse, OpenAIMessage, LLMReplyResult } from "../types"
import { estimateCost } from "./cost";


export async function generateWithGemini(prompt: OpenAIMessage[]): Promise<LLMReplyResult> {

    const geminiPrompt = convertToGeminiPrompt(prompt);

    const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: geminiPrompt,
            safetySettings: []
        })
    });

    if (!res.ok) {
        const err = await res.json() as GeminiError;
        console.error("❌ Gemini API error:", err);
        return {
            reply: `⚠️ Gemini error: ${err.error?.message ?? "unknown"}`,
            tokens_input: 0,
            tokens_output: 0,
            model: "gemini",
            cost_usd: 0
        };
    }

    const data = await res.json() as GeminiResponse;

    const generated_text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "…";

    const tokens_input = prompt.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
    const tokens_output = Math.ceil(generated_text.length / 4); // approx 4 chars per token

    return {
        reply: generated_text,
        tokens_input,
        tokens_output,
        model: "gemini",
        cost_usd: estimateCost("gemini", tokens_input, tokens_output),
        is_simulated: true,
    };

}


function convertToGeminiPrompt(messages: OpenAIMessage[]) {
    return messages
        .filter(msg => msg.role !== "system") // Gemini doesn't support 'system'
        .map(msg => ({
            role: msg.role === "assistant" ? "model" : msg.role,
            parts: [{ text: msg.content }]
        }));
}
