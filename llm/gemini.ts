import { GEMINI_API_KEY } from "../config/env";
import type { GeminiError , GeminiResponse } from "../types"


export async function generateWithGemini(prompt: string): Promise<string> {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [
                { role: "user", parts: [{ text: prompt }] }
            ],
            safetySettings: []
        })
    });

    if (!res.ok) {
        const err = await res.json() as GeminiError;
        console.error("❌ Gemini API error:", err);
        return `⚠️ Gemini error: ${err.error?.message ?? "unknown"}`;
    }

    const data = await res.json() as GeminiResponse;
    console.log(data);
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "…";
}
