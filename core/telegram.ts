import type {TelegramUpdateResponse} from "../types";
import { MODEL_BACKEND, TELEGRAM_TOKEN, MAX_HISTORY_COUNT } from "../config/env";
import { get, set } from "../memory/sqlite";
import { saveToChatHistory, getChatHistoryWithVectorSimilarity, getChatHistory } from "../memory/chat";
import { GenerateReply } from "../llm";
import { handleCommand } from "./command"
import '../types'

const api = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
let last_id = Number(get("last_id") ?? 0);
let last_chat_id = Number(get("last_chat_id") ?? 0);

/*
 * Core Logic
 * */
export async function StartPolling() {
    while (true) {
        try {
            const res = await fetch(`${api}/getUpdates?offset=${last_id + 1}&timeout=5`);
            const { ok, result } = await res.json() as TelegramUpdateResponse;

            if (ok && result.length) {
                for (const update of result) {
                    last_id = update.update_id;
                    ProcessMessage(update);
                    set("last_id", String(last_id));
                    set("last_chat_id", String(last_chat_id));
                }
            }

        } catch (e) {
            console.error("❌ Telegram error:", e);
        }

        await Bun.sleep(800);
    }
}


async function ProcessMessage(update: any) {
    const msg = update.message;
    if (!msg?.text) return;

    const chat_id = msg.chat.id;
    const user_msg = msg.text;
    last_chat_id = chat_id;

    try {
        if(await handleCommand(chat_id, user_msg)) return;

        // const history = await getChatHistoryWithVectorSimilarity(user_msg, parseInt(MAX_HISTORY_COUNT ?? "5"));
        const history = await getChatHistory(parseInt(MAX_HISTORY_COUNT ?? "5"));

        const typingInterval = setInterval(() => SendTypingAction(chat_id), 3000);
        const replyResult = await GenerateReply(history, user_msg, true);
        clearInterval(typingInterval);

        if(!replyResult.error) {
            // save user's chat
            await saveToChatHistory({
              chat_id,
              role: "user",
              content: user_msg,
            }, true);

            // save april's chat
            await saveToChatHistory({
              chat_id,
              role: "assistant",
              content: replyResult.reply,
              tokens_input: replyResult.tokens_input,
              tokens_output: replyResult.tokens_output,
              model: replyResult.model,
              cost_usd: replyResult.cost_usd,
              is_simulated: MODEL_BACKEND === "gemini"? true : false
            });
        }

        await SendMessage(chat_id, replyResult.reply);

    } catch(error) {
        const msg = `❌ Telegram error: ${error}`;
        SendMessage(chat_id, msg);
        throw error;
    }
}


async function SendTypingAction(chat_id: number) {
    await fetch(`${api}/sendChatAction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id,
            action: "typing"
        }),
    });
    console.log("👩‍💻 April is typing...");
}


export async function SendMessage(chat_id : string, reply : string) {
    await fetch(`${api}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id,
            text: reply.replace(`'`, ""),
            parse_mode: "Markdown"
        })
    });
    console.log("mesage sent", {chat_id, reply});
}


export async function GetLastChatID() {
    if(last_chat_id === 0) {
        const res = await fetch(`${api}/getUpdates?timeout=5`);
        const { ok, result } = await res.json() as TelegramUpdateResponse;
        console.log({last_id, result});
        if (ok && result.length) {
            for (const update of result) {
                const id = update.message?.chat.id;
                last_chat_id = id as number;
                set("last_chat_id", String(id));
                return id;
            }
        }
    }
    return last_chat_id;
}

