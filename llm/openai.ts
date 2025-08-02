import type { LLMReplyResult, AIModels, OpenAIMessage, OpenAIPrompt, OpenAIFormattedReply, OpenAIParsedOutput, Memory, MessageOutput } from "../types";
import  OpenAI from "openai";
import { OPENAI_API_KEY } from "../config/env";
import { estimateCost } from "./cost";
import { SaveMemory, GetMemory } from "../memory/chat";
import schema from "./schema.json";
import schema_v2 from "./schema_v2.json";
import { DateForPrompt, TimeForPrompt} from "../utils";
import { SendMessage, GetLastChatID } from "../core/telegram";
import { saveToChatHistory } from "../memory/chat";


type ProcessActionPayload = {
    input : OpenAIMessage[],
    model : AIModels,
    prompt : OpenAIPrompt,
    temperature : number,
}

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    project: "proj_xDfq3UzxHhYKlTUjOrUkPXYj",
});


const minified_prompt_soul_id = "pmpt_688852138d0c8197871ce6d4649c63760fa592d5316804a9";
const default_prompt = CreateReusablePrompt(minified_prompt_soul_id);


export async function GenerateWithOpenAI(
    input: OpenAIMessage[],
    reusable_prompt: OpenAIPrompt = default_prompt,
    tsl : boolean,
    model: AIModels = "gpt-4.1-mini",
    temperature: number = 0.80,
): Promise<LLMReplyResult> {

    const now = new Date();
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

        console.log("input", input);
        const prompt = CreateReusablePrompt("pmpt_6887771f68708195b7a5c517def825e3076ecc48bbbfc063", undefined, {
            date: DateForPrompt(now),
            time: TimeForPrompt(now),
        })

        const res = await SendPromptParsedMode(model, input, prompt, temperature, true);
        if(!res) {
            console.error(res);
            throw new Error('response empty');
        }
        let tokens = {
            input : res.usage?.input_tokens ?? 0,
            output : res.usage?.output_tokens ?? 0
        }
        console.log(JSON.stringify(res));

        let action_result = await ProcessAction(
            res.parsed,
            {
                input: [{role: 'assistant', content: res.parsed.reply},...input],
                model, prompt, temperature
            },
            tokens,
        );

        return {
            reply: action_result?.reply ?? "⚠️ No reply.",
            tokens_input : tokens.input,
            tokens_output : tokens.output,
            model: res.model ?? "openai",
            cost_usd: estimateCost(model, tokens.input, tokens.output),
        };

    } catch (error: any) {
        console.error("GenerateWithOpenAI() : ", error);
        return {
            reply: "❌ Failed to get reply from OpenAI. " + error.toString(),
            tokens_input: 0,
            tokens_output: 0,
            model: "openai",
            cost_usd: 0,
            error: true
        };
    }

}


// [DEPRECATED]
async function SendPrompt(model : AIModels, input: OpenAIMessage[], prompt : OpenAIPrompt, temperature: number, use_tools : boolean ) {
    try {
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


export async function SendPromptParsedMode(model : AIModels, input: OpenAIMessage[], prompt : OpenAIPrompt, temperature: number, use_tools : boolean ) {
    try {
        const res  = await openai.responses.parse({
            model,
            prompt,
            input,
            temperature,
            tool_choice: "auto",
            tools: use_tools ? [{ type: "web_search_preview", search_context_size: "low" }] : [],
            max_output_tokens: 512,
            text: {
                format: {
                    type: "json_schema",
                    name: "formatted_reply",
                    // schema: schema.schema,
                    schema: schema_v2.schema,
                    strict: true
                }
            }
        });
        console.log(JSON.stringify(res));
        // const parsed: OpenAIFormattedReply = raw.output?.[0]?.content[0]?.parsed ?? null;

        const output = res.output as OpenAIParsedOutput;
        const message = output.find((o) => o.type == 'message') as MessageOutput;
        if(!message) throw new Error("message not found")
        const content = message.content.find((c) => c.type == "output_text")
        const parsed : OpenAIFormattedReply | undefined = content?.parsed;

        if (!parsed) throw new Error("No parsed reply");

        console.log({parsed})

        return {
            parsed,
            usage: res.usage,
            output_text: res.output_text,
            model: res.model
        };

    } catch (err: any) {
        console.error("SendPromptParseMode() : ", err);
        return null;
    }
}


export function CreateReusablePrompt(id: string, version? : string, variables? : Record<string, string>) : OpenAIPrompt {
    return {
        id,
        version,
        variables
    }
}


export async function ProcessAction(
    reply: OpenAIFormattedReply,
    payload : ProcessActionPayload,
    tokens : {input: number, output: number}
) : Promise<null | OpenAIFormattedReply> {
    switch (reply.action.type) {
        case "write_memory":
        {
            console.log("🎬 ACTION TAKEN : write_memory");
            const { title, desc } = reply.action.data;

            const memory: Memory = {
                id: 0,
                type: "bond",
                title: title?.slice(0, 50) || "Untitled",
                memory_idea_desc: desc?.trim() || title || "Untitled",
                date_created: new Date().toISOString(),
                vector: "",
            };

            await SaveMemory(memory);
            console.log("✅ Memory written:", title);
            reply.reply += '\n ─────────────── \n *Memory Updated* ✅';
            return reply;
        }
        case "recall_memory":
        {
            console.log("🎬 ACTION TAKEN : recall_memory");
            const { model, input, prompt, temperature } = payload;
            const inquiry = reply.action.data.title + " - " + reply.action.data.desc;

            const memory: Memory[] = await GetMemory(inquiry);

            let formatted_mem : string = `No Memory found related to (${reply.action.data.title}), Michael's probably lying or forgot. You may remind him that no such thing ever happend`;

            if(memory.length > 0) {
                formatted_mem = memory.map((m, i) => {
                    return `# ${m.title}\n${m.memory_idea_desc}`;
                }).join("\n\n");
            }

            const memory_recalled: OpenAIMessage = {
                role: "user",
                content: `[🧠 Recalled Memory for Context]\n${formatted_mem}\n\n[End of Memory Section]`,
            };

            const input_with_memory = [...input, memory_recalled];
            console.log({input_with_memory})

            try {
                const reply = await SendPromptParsedMode(model, input_with_memory, prompt, temperature, true);
                if (reply) {
                    tokens.input += reply.usage?.input_tokens ?? 0;
                    tokens.output += reply.usage?.output_tokens ?? 0;
                    reply.parsed.reply += '\n ─────────────── \n *Memory Recalled* ✅';
                    return reply.parsed;
                }
                return null;
            } catch (e) {
                console.warn("⚠️ Failed to parse follow-up JSON:", e);
            }
            break;
        }
        case "ping":
        {
            console.log("🎬 ACTION TAKEN : ping");
            const { model, input, prompt, temperature } = payload;
            const chat_id = await GetLastChatID();
            await SendMessage(String(chat_id), reply.reply + "\n ───────────────  \n *ping* 🏓");
            await saveToChatHistory({
                chat_id: String(chat_id),
                role: "assistant",
                content: reply.reply,
                tokens_input: tokens.input,
                tokens_output: tokens.output,
                model,
                cost_usd: estimateCost(model, tokens.input, tokens.output)
            });
            return reply;
        }
        case "voicemail":
        {
            console.log("🎬 ACTION TAKEN : ping");
            const chat_id = await GetLastChatID();
            const { model, input, prompt, temperature } = payload;
            await saveToChatHistory({
                chat_id: String(chat_id),
                role: "assistant",
                content: reply.reply,
                tokens_input: tokens.input,
                tokens_output: tokens.output,
                model,
                chat_type: 'voicemail',
                cost_usd: estimateCost(model, tokens.input, tokens.output)
            });
            return reply;
        }
        case "none": {
            console.log("🎬 ACTION TAKEN : none");
            return reply;
        }

        default:
            console.warn("⚠️ Unknown action type:", reply.action.type);
    }

    return null;
}
