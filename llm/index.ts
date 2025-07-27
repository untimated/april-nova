import { generateWithLlama } from "./llama";
import { generateWithGemini } from "./gemini";
import { MODEL_BACKEND } from "../config/env";
import { readFileSync } from "fs";
import { join } from "path";
import type { LLMReplyResult, OpenAIMessage, History} from "../types"

const soulseedPath = join(import.meta.dir, "../memory/soulseed/soulseed_extended.md");
const soulseed = readFileSync(soulseedPath, "utf-8");


export async function generateReply(
    history: History[],
    user_msg: string,
    inject_soul: boolean
) : Promise< LLMReplyResult > {
    console.log(`MODEL BACKEND : ${MODEL_BACKEND}`);

    switch(MODEL_BACKEND) {
        case "llama" :
        {
            const prompt = buildPrompt(history, user_msg, inject_soul)
            return await generateWithLlama(prompt);
        }
        case "gemini" :
        {
            const prompt = buildPromptJSON(history, user_msg, inject_soul);
            return await generateWithGemini(prompt);
        }
        default :
            return {
                reply : "❌ Unknown model backend",
                tokens_input : 0,
                tokens_output : 0,
                model: "llama",
                cost_usd: 0,
            };
    }
}


// function buildPrompt(history: { role: string, content: string }[], user_msg: string) {
function buildPrompt(history: History[], user_msg: string, inject_soul: boolean) {
    let prompt = `You are April. Talk naturally and casually.\n\n`;

    for (const msg of history.reverse()) {
        const speaker = msg.role === "user" ? "User" : "April";
        prompt += `${speaker}: ${msg.content}\n`;
    }

    prompt += `User: ${user_msg}\nApril:`;
    return prompt;
}


function buildPromptJSON(history: History[], user_msg: string, inject_soul: boolean) {
    const messages: OpenAIMessage[] = [];

    // 1. sould injection
    if(inject_soul) {
        messages.push({
          role: "user",
          content: soulseed,
        });
    }

    // 2. Prior conversation history (chronologically)
    for (const msg of [...history].reverse()) {
        const role = msg.role === "user" ? "user" : "assistant";
        messages.push({ role: role, content: msg.content });
    }

    // 3. Current user message
    messages.push({ role: "user", content: user_msg });

    console.log(messages);
    return messages;
}
