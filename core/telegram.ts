import { MODEL_BACKEND, TELEGRAM_TOKEN } from "../config/env";
import { get, set } from "../memory/sqlite";
import type {TelegramUpdateResponse} from "../types";
import { saveToChatHistory, getChatHistory, getChatHistoryWithVectorSimilarity } from "../memory/chat";
import { generateReply } from "../llm";
import { handleCommand } from "./command"
import '../types'

const api = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
let last_id = Number(get("last_id") ?? 0);
let last_chat_id = Number(get("last_chat_id") ?? 0);
console.log({last_id, last_chat_id});

/*
 * Core Logic
 * */
export async function startPolling() {
    while (true) {
        try {
            const res = await fetch(`${api}/getUpdates?offset=${last_id + 1}&timeout=5`);
            const { ok, result } = await res.json() as TelegramUpdateResponse;

            if (ok && result.length) {
                for (const update of result) {
                    last_id = update.update_id;
                    handleOne(update);
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


async function handleOne(update: any) {
        const msg = update.message;
        if (!msg?.text) return;

        const chat_id = msg.chat.id;
        const user_msg = msg.text;
        last_chat_id = chat_id;

    try {
        if(await handleCommand(chat_id, user_msg)) return;

        const history = await getChatHistoryWithVectorSimilarity(chat_id, user_msg, 10);

        await sendTypingAction(chat_id);
        const replyResult = await generateReply(history, user_msg, true);
        console.log(replyResult);

        // save user's chat
        saveToChatHistory({
          chat_id,
          role: "user",
          content: user_msg,
        }, true);

        // save april's chat
        saveToChatHistory({
          chat_id,
          role: "assistant",
          content: replyResult.reply,
          tokens_input: replyResult.tokens_input,
          tokens_output: replyResult.tokens_output,
          model: replyResult.model,
          cost_usd: replyResult.cost_usd,
          is_simulated: MODEL_BACKEND === "gemini"? true : false
        });

        sendMessage(chat_id, replyResult.reply);

    } catch(error) {
        const msg = `❌ Telegram error: ${error}`;
        sendMessage(chat_id, msg);
        throw error;
    }
}


async function sendTypingAction(chat_id: number) {
    await fetch(`${api}/sendChatAction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id,
            action: "typing"
        }),
    });
    console.log("send chat action ", chat_id);
}


function convertToTelegramHTML(text: string): string {
  const safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  let result = safe
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<i>$1</i>');

  result = result.replace(/\\n/g, '\n');

  return result;
}


export async function sendMessage(chat_id : string, reply : string) {
    await fetch(`${api}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id,
            text: reply,
            parse_mode: "Markdown"
        })
    });
}


export async function getLastChatID() {
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

