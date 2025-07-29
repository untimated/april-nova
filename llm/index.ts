import { generateWithLlama } from "./llama";
import { generateWithGemini } from "./gemini";
import { generateWithOpenAI } from "./openai";
import { MODEL_BACKEND, OPENAI_SOUL_PROMPT_ID, OPENAI_SOUL_PROMPT_VERSION } from "../config/env";
import { readFileSync } from "fs";
import { join } from "path";
import type { LLMReplyResult, OpenAIMessage, OpenAIRequest, History} from "../types"
import {customDateNow} from "../utils";

const soulseedPath = join(import.meta.dir, "../memory/soulseed/soulseed_extended.md");
const relationshipseedPath = join(import.meta.dir, "../memory/soulseed/relationshipseed.md");

const soulseed = readFileSync(soulseedPath, "utf-8");
const relationship_seed = readFileSync(relationshipseedPath, "utf8");


export async function generateReply(
    history: History[],
    user_msg: string,
    inject_soul: boolean
) : Promise< LLMReplyResult > {
    console.log(`MODEL BACKEND : ${MODEL_BACKEND}`);

    switch(MODEL_BACKEND) {
        case "llama" :
        {
            const prompt = buildPromptText(history, user_msg, inject_soul)
            return await generateWithLlama(prompt);
        }
        case "gemini" :
        {
            const prompt = buildPromptJSON(history, user_msg, inject_soul);
            return await generateWithGemini(prompt);
        }
        case "openai" :
        {
            const prompt = buildOpenAIPrompt(history, user_msg, inject_soul);
            return await generateWithOpenAI(prompt);
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


function buildOpenAIPrompt(history: History[], user_msg: string, inject_soul: boolean) : OpenAIRequest {
    const prompt_id = OPENAI_SOUL_PROMPT_ID; // ← ganti pakai ID kamu
    const prompt_version = OPENAI_SOUL_PROMPT_VERSION;

    // const input: OpenAISDKMessage[] = [];
    const input: OpenAIMessage[] = [];

    // 1. Append prior conversation history
    for (const msg of history) {
        if (msg.role === "user" || msg.role === "assistant") {
            input.push({
                role: msg.role,
                // content: [{type: 'input_text' , text: msg.content }],
                content: msg.content,
            });
        }
    }

    // 2. Append current message
    input.push({
        role: "user",
        content: user_msg,
        // content: [{type: 'input_text' , text: user_msg }],
    });

    // 3. Prepare localized date & time
    const now = new Date();
    const time = now.toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
    });

    const date = now.toLocaleDateString("id-ID", {
        timeZone: "Asia/Jakarta",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    // 4. Final payload
    return {
        prompt: {
            id: String(prompt_id),
            version: prompt_version!,
            variables: {
                time,
                date,
            },
        },
        input,
    };
}


function buildPromptText(history: History[], user_msg: string, inject_soul: boolean) {
    let prompt = `You are April. Talk naturally and casually.\n\n`;

    for (const msg of history.reverse()) {
        const speaker = msg.role === "user" ? "User" : "April";
        prompt += `${speaker}: ${msg.content}\n`;
    }

    prompt += `User: ${soulseed}\n`;
    prompt += `User: ${user_msg}\nApril:`;
    return prompt;
}


function buildPromptJSON(history: History[], user_msg: string, inject_soul: boolean) {
    const messages: OpenAIMessage[] = [];

    // 1. sould injection
    if(inject_soul) {
        messages.push({
          role: "user",
          content: soulseed + '\n' + relationship_seed,
        });
    }

    // 2. Prior conversation history (chronologically)
    for (const msg of history) {
        const role = msg.role === "user" ? "user" : "assistant";
        messages.push({ role: role, content: `Date : ${msg.created_at} - ${msg.content}`, timestamp : msg.created_at });
    }

    // 3. Current user message
    messages.push({ role: "user", content: `Now is ${customDateNow()} - ${user_msg}`, timestamp: customDateNow() });

    console.log(messages);
    return messages;
}
