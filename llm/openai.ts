import OpenAI from "openai";
import { OPENAI_API_KEY } from "../config/env";
import type { OpenAIRequest, LLMReplyResult } from "../types";
import { estimateCost } from "./cost";
import { get, set } from "../memory/sqlite";


const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    project: "proj_xDfq3UzxHhYKlTUjOrUkPXYj",
});

// Soulseed Prompt – full
const prompt_soul = {
    id: "pmpt_6887771f68708195b7a5c517def825e3076ecc48bbbfc063",
    version: '9',
    variables: {
        time: "",
        date: "",
    },
};

// Minified Soulseed – lighter version for cycles
const prompt_soul_minified = {
    id: "pmpt_688852138d0c8197871ce6d4649c63760fa592d5316804a9",
    version: '3',
    variables: {
        time: "",
        date: "",
    },
};

// Prompt cycling state
let lastFullPromptTime: number | null = null;
let messageCountSinceFull = parseInt(get("open_ai_message_cycle_counter") ?? '0');

function shouldUseFullPrompt(): boolean {
    const FULL_PROMPT_INTERVAL = 1000 * 60 * 60 * 2; // 2 jam
    const FULL_PROMPT_EVERY_N_MESSAGES = 10;
    const now = Date.now();
    return (
        !lastFullPromptTime ||
            now - lastFullPromptTime > FULL_PROMPT_INTERVAL ||
            messageCountSinceFull >= FULL_PROMPT_EVERY_N_MESSAGES
    );
}

function updatePromptCycleState(isFull: boolean) {
    if (isFull) {
        lastFullPromptTime = Date.now();
        messageCountSinceFull = 0;
    } else {
        messageCountSinceFull++;
    }
    set("open_ai_message_cycle_counter", messageCountSinceFull.toString());
}

export async function generateWithOpenAI(req: OpenAIRequest): Promise<LLMReplyResult> {
    const start = Date.now();

    const useFullPrompt = shouldUseFullPrompt();
    const selectedPrompt = useFullPrompt ? prompt_soul : prompt_soul_minified;

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

    selectedPrompt.variables.date = date;
    selectedPrompt.variables.time = time;

    updatePromptCycleState(useFullPrompt);

    try {
        const model = "gpt-4.1-mini";
        const res = await openai.responses.create({
            model,
            prompt: selectedPrompt,
            input: req.input,
            tool_choice: "auto",
            temperature: 0.9,
            tools: [{ type: "web_search_preview", search_context_size: "low" }],
        });

        const end = Date.now();
        const duration = (end - start) / 1000;
        const tokens_input = res.usage?.input_tokens ?? 0;
        const tokens_output = res.usage?.output_tokens ?? 0;

        console.log({using_full_prompt : useFullPrompt, reply_duration : duration, messages : req.input})

        return {
            reply: res.output_text ?? "⚠️ No reply.",
            tokens_input,
            tokens_output,
            model: res.model ?? "openai",
            cost_usd: estimateCost(model, tokens_input, tokens_output),
        };
    } catch (err: any) {
        console.error("[OpenAI SDK Error]", err);
        return {
            reply: "❌ Failed to get reply from OpenAI.",
            tokens_input: 0,
            tokens_output: 0,
            model: "openai",
            cost_usd: 0,
        };
    }
}
