import type { LLMReplyResult, OpenAIMessage, OpenAIRequest, History, AIModels} from "../types"
import { MODEL_BACKEND, OPENAI_SOUL_PROMPT_ID, OPENAI_SOUL_PROMPT_VERSION } from "../config/env";
import { generateWithLlama } from "./llama";
import { generateWithGemini } from "./gemini";
import { GenerateWithOpenAI, CreateReusablePrompt } from "./openai";
import { GetCurrentWIBTime ,TimeForPrompt, DateForPrompt} from "../utils";
import { TSL } from "./tsl";
import { join } from "path";
import { readFileSync } from "fs";

const soulseedPath = join(import.meta.dir, "../memory/soulseed/soulseed_extended.md");
const relationshipseedPath = join(import.meta.dir, "../memory/soulseed/relationshipseed.md");

const soulseed = readFileSync(soulseedPath, "utf-8");
const relationship_seed = readFileSync(relationshipseedPath, "utf8");


export async function GenerateReply(
    history: History[],
    user_msg: string,
    inject_soul: boolean
) : Promise< LLMReplyResult > {

    switch(MODEL_BACKEND) {
        case "llama" :
        {
            const prompt = BuildMessages(history, user_msg, inject_soul, 'text') as string;
            return await generateWithLlama(prompt);
        }
        case "gemini" :
        {
            const prompt = BuildMessages(history, user_msg, inject_soul, 'json') as OpenAIMessage[];
            return await generateWithGemini(prompt);
        }
        case "openai" :
        {
            const now = new Date();

            const tsl = await TSL.OpenAI.ThoughtChain(user_msg, history);
            const model : AIModels = tsl.escalate_model ? "gpt-4o-2024-05-13" : "gpt-4.1-mini";
            const reusable_prompt = CreateReusablePrompt(
                OPENAI_SOUL_PROMPT_ID!,
                undefined,
                {
                    time : TimeForPrompt(now),
                    date : DateForPrompt(now)
                }
            )
            const input = BuildOpenAIMessages([...history.slice(-2)], user_msg, tsl.inject);
            return await GenerateWithOpenAI(input, reusable_prompt, false, model);
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


function BuildOpenAIMessages(history: History[], user_msg: string, tsl_inject? : string) : OpenAIMessage[] {
    let input: OpenAIMessage[] = [];
    if(tsl_inject) {
        input.push({
            role: "system",
            content: tsl_inject
        });
    }
    for (const msg of history) {
        if (msg.role === "user" || msg.role === "assistant") {
            input.push({
                role: msg.role,
                content: msg.content,
            });
        }
    }
    input.push({
        role: "user",
        content: user_msg,
    });

    return input;
}


function BuildMessages(history: History[], user_msg: string, inject_soul: boolean, format : 'text' | 'json') : string | OpenAIMessage[] {
    if(format === 'text') {
        let prompt = `You are April. Talk naturally and casually.\n\n`;

        for (const msg of history.reverse()) {
            const speaker = msg.role === "user" ? "User" : "April";
            prompt += `${speaker}: ${msg.content}\n`;
        }

        prompt += `User: ${soulseed}\n`;
        prompt += `User: ${user_msg}\nApril:`;
        return prompt;
    }
    else if(format === 'json') {
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
        messages.push({ role: "user", content: `Now is ${GetCurrentWIBTime()} - ${user_msg}`, timestamp: GetCurrentWIBTime() });

        console.log(messages);
        return messages;
    }
    else {
        throw new Error('unknown format')
    }
}

