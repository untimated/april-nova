import { generateWithLlama } from "./llama";
import { generateWithGemini } from "./gemini";
import { MODEL_BACKEND } from "../config/env";
import type { OpenAIMessage} from "../types"


// export async function generateReply(prompt: string): Promise<string> {
export async function generateReply(history: { role: string, content: string }[], user_msg: string) {
    console.log(`MODEL BACKEND : ${MODEL_BACKEND}`);
    switch(MODEL_BACKEND) {
        case "llama" :
        {
            const prompt = buildPrompt(history, user_msg)
            return await generateWithLlama(prompt);
        }
        case "gemini" :
        {
            const prompt = buildPromptJSON(history, user_msg);
            return await generateWithGemini(prompt);
        }
        default :
            return "❌ Unknown model backend";
    }
}


function buildPrompt(history: { role: string, content: string }[], user_msg: string) {
    let prompt = `You are April. Talk naturally and casually.\n\n`;

    for (const msg of history.reverse()) {
        const speaker = msg.role === "user" ? "User" : "April";
        prompt += `${speaker}: ${msg.content}\n`;
    }

    prompt += `User: ${user_msg}\nApril:`;
    return prompt;
}


function buildPromptJSON(history: { role: string, content: string }[], user_msg: string) {
    const messages: OpenAIMessage[] = [];
    // 1. System role message
    messages.push({
        role: "system",
        content: "You are April. Talk naturally and casually."
    });
    // 2. Prior conversation history (chronologically)
    for (const msg of [...history].reverse()) {
        const role = msg.role === "user" ? "user" : "assistant";
        messages.push({ role: role, content: msg.content });
    }
    // 3. Current user message
    messages.push({ role: "user", content: user_msg });
    return messages;
}
