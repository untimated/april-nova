import { TELEGRAM_TOKEN } from "./config/env";
import { get, set } from "./memory/sqlite";
import type {TelegramUpdateResponse} from "./types";
import { saveToChatHistory, getChatHistory } from "./memory/chat";
import { generateReply } from "./llm";
import { handleCommand } from "./command"
import './types'

const api = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
let last_id = Number(get("last_id") ?? 0);


export async function sendMessage(chat_id : string, reply : string) {
    await fetch(`${api}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id, text: reply })
    });
}


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
                }
            }

        } catch (e) {
            console.error("❌ Telegram error:", e);
        }

        await Bun.sleep(800);
    }
}


async function handleOne(update: any) {
    try {
        const msg = update.message;
        if (!msg?.text) return;

        const chat_id = msg.chat.id;
        const user_msg = msg.text;

        if(await handleCommand(chat_id, user_msg)) return;

        const history = await getChatHistory(chat_id, user_msg);

        await sendTypingAction(chat_id);
        const replyResult = await generateReply(history, user_msg);

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
          cost_usd: replyResult.cost_usd
        });

        sendMessage(chat_id, replyResult.reply);

    } catch(error) {
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


