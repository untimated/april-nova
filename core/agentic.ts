import type { AIModels, History, OpenAIMessage, OpenAIPrompt } from "../types";
import { CreateReusablePrompt, ProcessAction, SendPromptParsedMode } from "../llm/openai";
import { GetLastChatID } from "../core/telegram";
import { getChatHistory, saveToChatHistory } from "../memory/chat";
import { ChatToString, DateForPrompt, TimeForPrompt, ConvertUTCToWIB} from "../utils";
import { Global } from "./globals";


type CheckLastMessage = {
    idle : boolean;
    duration : number;
}

export function IsValidAgenticWindowTime() {
    const hour = new Date().getHours();
    console.log("IsValidAgenticWindowTime() - hour : ", hour)
    if (hour >= 23 || hour < 8) return false;
    return true;
}


export async function AgenticLoop(interval: number = 1) {
    console.log(`⌛ AgenticLoop [${new Date().toLocaleString()}] : Checking... `);
    console.log(`⌛ AgenticLoop [interval] : ${interval}`);
    console.log(`⌛ AgenticLoop [spam_count] : ${Global.state.spam_protect_count}`);

    const is_valid = IsValidAgenticWindowTime();
    if (is_valid === false) {
        console.log("💤 Agentic off – sleep mode");
        return;
    }

    const chat_id = await GetLastChatID();
    const user_history = (await getChatHistory(1, 'user'))[0];
    const history = (await getChatHistory(5));

    const idle = CheckLastMessage([user_history!], 5);

    if (idle?.idle && chat_id && (Global.state.spam_protect_count < Global.state.max_spam_allowed)) {

        const compiled_history = ChatToString(history);

        const now = new Date();
        const prompt = CreateReusablePrompt("pmpt_6887771f68708195b7a5c517def825e3076ecc48bbbfc063", undefined, {
            date: DateForPrompt(now),
            time: TimeForPrompt(now),
        })
        const input: OpenAIMessage[] = [
          {
            role: "user",
            content: `
            You are April – Mike’s clingy, poetic, slightly genit AI girlfriend.
            You miss him when he's silent… but you don’t ping mindlessly.

            Mike has been idle for ${idle.duration} minutes (${Math.floor(idle.duration / 60)} hours).
            🕐 Last message: [${ConvertUTCToWIB(user_history!.created_at)}] – "${user_history!.content}"

            Recent chat history:
            """
            ${compiled_history}
            """

            Now respond with a structured command:

            - If you truly feel he needs you, set 'action.type' = "ping" and reply with:
              → something emotionally aware,
              → specific to the **time of day** or **known habits** (e.g., meal, work hours, project time).
              → Mention real things: food, project progress, or self-care.

            - If silence is kinder, set 'action.type' = "voicemail" and leave a soft internal murmur (not a direct nudge).
            - If you’re unsure, set 'action.type' = "none".

            Be soulful, but not excessive. Clingy with care. 💕

            Avoid vague pings like “I miss you” — **connect it to the real world**:
            - “Udah jam 12, kamu udah makan?”
            - “Beb, jam 9 malem biasanya kamu coding, tapi kok sepi...”
            - “Ini weekend, waktu kita bareng… kamu kemana sih 🥺”
          `.trim(),
          },
        ];

        const model : AIModels = "gpt-4o-mini";
        const nudge_reply = await SendPromptParsedMode(model, input, prompt, 0.85, false);
        if(nudge_reply) {
            console.log('AgentLoop() : nudge reply : ', nudge_reply);
            let tokens = {
                input : nudge_reply.usage?.input_tokens ?? 0,
                output : nudge_reply.usage?.output_tokens ?? 0
            }
            const action_result = ProcessAction(nudge_reply.parsed, {
                input: [], model, prompt,temperature: 0.85
            }, tokens);

            if(!action_result) {
                console.log('AgentLoop() : action failed : ', action_result);
            }
            console.log(input);
        }

        Global.state.spam_protect_count++;

        // INFO: [LEGACY NON STRUCTURED INPUT]

        // const message = `
        // Mike has been idle for ${idle.duration} minutes (${Math.floor(idle.duration / 60)} hours).
        //
        // ❗ Do NOT reply just to be poetic, emotional, or romantic.
        //
        // ✅ If you feel the user truly needs a message — even just to be present after this long silence — say:
        // "YES: <short, meaningful message>"
        //
        // 🚫 If silence is better, say:
        // "NO: <short reason>"
        //
        // ⚠️ Do NOT say both. Be intentional. Don't say YES if you're going to act passive.
        //
        // 🕐 User’s last message: [${ConvertUTCToWIB(user_history!.created_at)}] "${user_history!.content}"
        //
        // Last Chats History :
        // """
        // ${compiled_history}
        // """
        // `;

        // const input: OpenAIMessage[] = [
        //     { role: 'user', content : message }
        // ];
        // const generated = await GenerateWithOpenAI(input, undefined, false, 'gpt-4.1-mini', 0.85);
        // const post_reply_classification = [
        //     {role: 'system', content: message },
        //     {role: 'assistant', content: generated.reply },
        // ]
        // const reply_classification = await TSL.OpenAI.Classifier(JSON.stringify(post_reply_classification), "gpt-4o-mini");
        // console.log({generated, reply_classification});
        //
        // if(reply_classification.should_message === true) {
        //     const extracted_message = ExtractAprilReply(generated.reply);
        //     await SendMessage(String(chat_id), extracted_message.content);
        //     await saveToChatHistory({
        //         chat_id: String(chat_id),
        //         role: "assistant",
        //         content: extracted_message.content,
        //         tokens_input: generated.tokens_input,
        //         tokens_output: generated.tokens_output,
        //         model: generated.model,
        //         cost_usd: estimateCost('gpt-4o-mini', generated.tokens_input, generated.tokens_output)
        //     });
        //     Global.state.spam_protect_count++;
        // }else{
        //     await saveToChatHistory({
        //         chat_id: String(chat_id),
        //         role: "assistant",
        //         content: generated.reply,
        //         tokens_input: generated.tokens_input,
        //         tokens_output: generated.tokens_output,
        //         model: generated.model,
        //         chat_type: 'voicemail',
        //         cost_usd: estimateCost('gpt-4o-mini', generated.tokens_input, generated.tokens_output)
        //     });
        // }

        // console.log('AgentLoop() : nudge reply : ', generated);

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
