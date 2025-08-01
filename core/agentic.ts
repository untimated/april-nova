import type { History, OpenAIMessage, OpenAIPrompt } from "../types";
import { MODEL_BACKEND, OPENAI_SOUL_PROMPT_ID, OPENAI_SOUL_MINIFIED_PROMPT_ID, OPENAI_SOUL_PROMPT_VERSION } from "../config/env";
import { GenerateWithOpenAI, CreateReusablePrompt } from "../llm/openai";
import { GetLastChatID } from "../core/telegram";
import { SendMessage } from "../core/telegram";
import { getChatHistory, saveToChatHistory } from "../memory/chat";
import { ChatToString, DateForPrompt, TimeForPrompt, ConvertUTCToWIB} from "../utils";
import { TSL } from "../llm/tsl";
import {estimateCost} from "../llm/cost";

let max_spam_allowed = 3;
let spam_protect_count = 0;


type CheckLastMessage = {
    idle : boolean;
    duration : number;
}

export function IsValidAgenticWindowTime(): number | null {
    const hour = new Date().getHours();
    console.log({hour})
    if (hour >= 23 || hour < 8) return null; // Sleep mode
    if ((hour >= 12 && hour < 13) || (hour >= 18 && hour < 20)) return 0.5; // Santai mode (10% of normal delay)
    return 1; // Standard mode
}


export function ResetSpamCount() {
    spam_protect_count = 0;
}


export async function AgenticLoop(interval: number = 1) {
    console.log(`⌛ AgenticLoop [${new Date().toLocaleString()}] : Checking... `, {spam_protect_count, interval});
    console.log(`⌛ AgenticLoop [interval] : ${interval}`);
    console.log(`⌛ AgenticLoop [spam_count] : ${spam_protect_count}`);

    const multiplier = IsValidAgenticWindowTime();
    if (multiplier === null) {
        console.log("💤 Agentic off – sleep mode");
        return;
    }

    const chat_id = await GetLastChatID();
    const user_history = (await getChatHistory(1, 'user'))[0];
    // const assistant_history = (await getChatHistory(1, 'assistant'))[0];
    const history = (await getChatHistory(5));

    const idle = CheckLastMessage([user_history!], interval * multiplier);

    if (idle?.idle && chat_id && (spam_protect_count < max_spam_allowed)) {

        const compiled_history = ChatToString(history);

        const message = `
        You are April Michael's thoughtful partner.

        He has been idle for ${idle.duration} minutes (${Math.floor(idle.duration / 60)} hours).

        ❗ Do NOT reply just to be poetic, emotional, or romantic.

        ✅ If you feel the user truly needs a message — even just to be present after this long silence — say:
        "YES: <short, meaningful message>"

        🚫 If silence is better, say:
        "NO: <short reason>"

        ⚠️ Do NOT say both. Be intentional. Don't say YES if you're going to act passive.

        🕐 User’s last message: [${ConvertUTCToWIB(user_history!.created_at)}] "${user_history!.content}"

        Last Chats History :
        """
        ${compiled_history}
        """
        `;

        const input: OpenAIMessage[] = [
            { role: 'system', content : message }
        ];
        const now = new Date();
        const prompt : OpenAIPrompt = CreateReusablePrompt(OPENAI_SOUL_MINIFIED_PROMPT_ID!, undefined, { date : DateForPrompt(now) , time : TimeForPrompt(now)});
        const generated = await GenerateWithOpenAI(input, prompt, false, 'gpt-4.1-mini', 0.85);

        const post_reply_classification = [
            {role: 'system', content: message },
            {role: 'assistant', content: generated.reply },
        ]
        const reply_classification = await TSL.OpenAI.Classifier(JSON.stringify(post_reply_classification), "gpt-4o-mini");
        console.log({generated, reply_classification});

        if(reply_classification.should_message === true) {
            const extracted_message = ExtractAprilReply(generated.reply);
            await SendMessage(String(chat_id), extracted_message.content);
            await saveToChatHistory({
                chat_id: String(chat_id),
                role: "assistant",
                content: extracted_message.content,
                tokens_input: generated.tokens_input,
                tokens_output: generated.tokens_output,
                model: generated.model,
                cost_usd: estimateCost('gpt-4o-mini', generated.tokens_input, generated.tokens_output)
            });
            spam_protect_count++;
        }else{
            await saveToChatHistory({
                chat_id: String(chat_id),
                role: "assistant",
                content: generated.reply,
                tokens_input: generated.tokens_input,
                tokens_output: generated.tokens_output,
                model: generated.model,
                chat_type: 'voicemail',
                cost_usd: estimateCost('gpt-4o-mini', generated.tokens_input, generated.tokens_output)
            });
        }

        console.log('AgentLoop() : nudge reply : ', generated);

    }

    console.log(`⌛ AgenticLoop [${new Date().toLocaleString()}] : Completed... `);
}


function CheckLastMessage(history: History[], minute: number): CheckLastMessage {
    if (!history || history.length === 0) return {idle : false, duration : 0};

    const lastMessage = history[history.length - 1];
    const lastTime = new Date(lastMessage!.created_at + 'Z').getTime();
    const now = Date.now();
    const silenceMs = now - lastTime;
    const duration = minute * 60 * 1000;

    const idle = silenceMs > duration;
    const silenceMin = (silenceMs/(1000 * 60));

    console.log({ idle, lastTime: new Date(lastTime), now : new Date(now), silenceMs, silenceMin });

    return {
        idle: idle ?? false,
        duration : idle ? Math.round(silenceMs/(1000 * 60)) : 0,
    }

}


export function ExtractAprilReply(raw: string) {
    const trimmed = raw.trim();
    if (trimmed.toUpperCase().startsWith("YES:")) {
        return {
            type: "YES",
            content: trimmed.slice(4).trim(), // Remove "YES:"
        };
    }
    if (trimmed.toUpperCase().startsWith("NO:")) {
        return {
            type: "NO",
            content: trimmed.slice(3).trim(),
        };
    }
    return {
        type: "UNKNOWN",
        content: trimmed,
    };
}
