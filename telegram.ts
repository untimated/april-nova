import { TELEGRAM_TOKEN } from "./config/env";
import { get, set } from "./memory/sqlite";
import type {TelegramUpdateResponse} from "./types";
import { storeMessage, getRecentMessages } from "./memory/chat";
import { generateReply } from "./llm";
import './types'

const api = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
let last_id = Number(get("last_id") ?? 0);


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
    const msg = update.message;
    if (!msg?.text) return;

    const chat_id = msg.chat.id;
    const user_msg = msg.text;

    // TODO :prioritze command /remember

    const history = getRecentMessages(chat_id, 10);
    const prompt = buildPrompt(history, user_msg);
    await sendTypingAction(chat_id);
    const reply = await generateReply(prompt);

    storeMessage(chat_id, "user", user_msg);
    storeMessage(chat_id, "assistant", reply);

    await fetch(`${api}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id, text: reply })
    });
}


function buildPrompt(history: { role: string, content: string }[], user_msg: string) {
    let prompt = `You are April. Talk naturally and casually.\n\n`;

    for (const msg of history.reverse()) {
        const speaker = msg.role === "user" ? "User" : "April";
        prompt += `${speaker}: ${msg.content}\n`;
    }

    prompt += `User: ${user_msg}\nApril:`;
    return prompt;
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



