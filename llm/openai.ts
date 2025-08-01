import type { LLMReplyResult, AIModels, OpenAIMessage, OpenAIPrompt } from "../types";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "../config/env";
import { estimateCost } from "./cost";
import { get, set } from "../memory/sqlite";
import { DateForPrompt, TimeForPrompt} from "../utils";


const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    project: "proj_xDfq3UzxHhYKlTUjOrUkPXYj",
});

// Soulseed Prompt – full
const prompt_soul : OpenAIPrompt = {
    id: "pmpt_6887771f68708195b7a5c517def825e3076ecc48bbbfc063",
    // version: '9',
    variables: {
        time: "",
        date: "",
    },
};

// Minified Soulseed – lighter version for cycles
const prompt_soul_minified : OpenAIPrompt = {
    id: "pmpt_688852138d0c8197871ce6d4649c63760fa592d5316804a9",
    // version: '3',
    variables: {
        time: "",
        date: "",
    },
};


// Prompt cycling state
let lastFullPromptTime: number | null = null;
let messageCountSinceFull = parseInt(get("open_ai_message_cycle_counter") ?? '0');


function ShouldUseFullPrompt(): boolean {
    const FULL_PROMPT_INTERVAL = 1000 * 60 * 60 * 2; // 2 jam
    const FULL_PROMPT_EVERY_N_MESSAGES = 10;
    const now = Date.now();
    return (
        !lastFullPromptTime ||
            now - lastFullPromptTime > FULL_PROMPT_INTERVAL ||
            messageCountSinceFull >= FULL_PROMPT_EVERY_N_MESSAGES
    );
}


function UpdatePromptCycleState(isFull: boolean) {
    if (isFull) {
        lastFullPromptTime = Date.now();
        messageCountSinceFull = 0;
    } else {
        messageCountSinceFull++;
    }
    set("open_ai_message_cycle_counter", messageCountSinceFull.toString());
}


export async function GenerateWithOpenAI(
    // req: OpenAIRequest,
    input: OpenAIMessage[],
    reusable_prompt: OpenAIPrompt,
    tsl : boolean,
    model: AIModels = "gpt-4.1-mini",
    temperature: number = 0.85,
): Promise<LLMReplyResult> {


    if(tsl) {
        try {
            const res = await SendPrompt(model, input, reusable_prompt, temperature, false);
            if(!res) {
                throw new Error('response empty');
            }
            const tokens_input = res.usage?.input_tokens ?? 0;
            const tokens_output = res.usage?.output_tokens ?? 0;
            return {
                reply: res.output_text ?? "⚠️ No reply.",
                tokens_input,
                tokens_output,
                model: res.model ?? "openai",
                cost_usd: estimateCost(model, tokens_input, tokens_output),
            };
        } catch(e) {
            throw e;
        }
    }

    try {

        const useFullPrompt = ShouldUseFullPrompt();
        const selectedPrompt = useFullPrompt ? prompt_soul : prompt_soul_minified;

        const now = new Date();
        selectedPrompt.variables!.date = DateForPrompt(now);
        selectedPrompt.variables!.time = TimeForPrompt(now);

        UpdatePromptCycleState(useFullPrompt);

        const res = await SendPrompt(model, input, selectedPrompt, temperature, true);
        // console.log(JSON.stringify(res))

        if(!res) {
            throw new Error('response empty');
        }

        const tokens_input = res.usage?.input_tokens ?? 0;
        const tokens_output = res.usage?.output_tokens ?? 0;


        return {
            reply: res.output_text ?? "⚠️ No reply.",
            tokens_input,
            tokens_output,
            model: res.model ?? "openai",
            cost_usd: estimateCost(model, tokens_input, tokens_output),
        };

    } catch (err: any) {
        console.error("GenerateWithOpenAI() : ", err);
        return {
            reply: "❌ Failed to get reply from OpenAI.",
            tokens_input: 0,
            tokens_output: 0,
            model: "openai",
            cost_usd: 0,
        };
    }

}


async function SendPrompt(model : AIModels, input: OpenAIMessage[], prompt : OpenAIPrompt, temperature: number, use_tools : boolean ) {
    try {
        // console.log({model, use_tools, input})
        const res = await openai.responses.create({
            model,
            prompt,
            input,
            tool_choice: "auto",
            temperature,
            tools: use_tools ? [{ type: "web_search_preview", search_context_size: "low" }] : [],
        });

        return res;

    } catch (err: any) {
        console.error("SendPrompt() : ", err);
    }
}


export function CreateReusablePrompt(id: string, version? : string, variables? : Record<string, string>) : OpenAIPrompt {
    return {
        id,
        version,
        variables
    }
}
