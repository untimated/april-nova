import { GEMINI_API_KEY } from "../config/env";
import type { GeminiError , GeminiResponse, OpenAIMessage } from "../types"


export async function generateWithGemini(prompt: OpenAIMessage[]): Promise<string> {

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
        return `⚠️ Gemini error: ${err.error?.message ?? "unknown"}`;
    }

    const data = await res.json() as GeminiResponse;
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "…";


}


function convertToGeminiPrompt(messages: OpenAIMessage[]) {
    return messages
        .filter(msg => msg.role !== "system") // Gemini doesn't support 'system'
        .map(msg => ({
            role: msg.role === "assistant" ? "model" : msg.role,
            parts: [{ text: msg.content }]
        }));
}
