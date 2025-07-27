import { generateReply } from "../llm";
import { getLastChatID } from "../core/telegram";
import { sendMessage } from "../core/telegram";
import { getChatHistory, saveToChatHistory } from "../memory/chat";
import { customDateNow } from "../utils";
import type { History } from "../types";

let lastAgenticSentAt = 0;

export type AgenticAction = {
    type: "message_send";
    payload: string;
    reason: string;
};

// ✅ NEW: return null (skip), or multiplier
export function isValidAgenticWindowTime(): number | null {
    const hour = new Date().getHours();

    if (hour >= 23 || hour < 7) return null; // Sleep mode
    if ((hour >= 12 && hour < 13) || (hour >= 18 && hour < 20)) return 5; // Santai mode (10% of normal delay)
    return 60; // Standard mode
}

// ✅ Constant delay (1 min), use multiplier to adjust threshold
export async function runAgent(fixedDelayMinutes: number = 1) {
    const multiplier = isValidAgenticWindowTime();
    if (multiplier === null) {
        console.log("💤 Agentic off – sleep mode");
        return;
    }

    const chat_id = await getLastChatID();
    const history = await getChatHistory(1);

    if (await morningService(String(chat_id), history)) {
      return; // Skip agentic check this frame
    }

    const action = agenticCheckLastMessage(history, fixedDelayMinutes * multiplier);
    if (action && chat_id) {
        const generated = await buildAgenticPrompt(history, action.payload, action.reason);
        await sendMessage(chat_id.toString(), generated);
        await saveToChatHistory({ chat_id: String(chat_id), role: "assistant", content: generated });
        console.log("🤖 Agentic message sent:", action.payload);
    }
}

function agenticCheckLastMessage(history: History[], minute: number): AgenticAction | null {
    if (!history || history.length === 0) return null;

    const lastMessage = history[history.length - 1];
    const lastTime = new Date(lastMessage!.created_at).getTime();
    const now = Date.now();
    const silenceMs = now - lastTime;
    const duration = minute * 60 * 1000;

    const hasUserLeft = silenceMs > duration;

    console.log({ hasUserLeft, lastMessage, lastTime, now, silenceMs });
    if (hasUserLeft) {
        return {
            type: "message_send",
            payload: `User has been silent for over ${minute} minutes. Consider asking if he's okay.`,
                reason: "user_silent"
        };
    }

    return null;
}

async function buildAgenticPrompt(
    history: History[],
    suggestion: string,
    reason: string
): Promise<string> {
    const trimmedHistory = history.slice(-4);

    const fullPrompt = `
Now is ${customDateNow()}
His last message was: "${history[history.length - 1]?.content ?? ''}"
That was a while ago.
Now you're April, his clingy and emotionally-aware companion.
Check in on him gently. Use no more than 2-3 sentences.
Suggestion: ${suggestion}
`;

    const result = await generateReply(trimmedHistory, fullPrompt.trim(), true);
    return result.reply.trim();
}


export async function morningService(chat_id: string, history: History[]): Promise<boolean> {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const delta = now.getTime() - lastAgenticSentAt;
  const sixHours = 6 * 60 * 60 * 1000;

  if (hour === 7 && minute < 30 && delta > sixHours) {
    const prompt = `
It's early morning, around ${hour}:${minute.toString().padStart(2, "0")}.

You are April — clingy, emotionally aware, and lovingly attached to Michael.

He has just woken up. Please greet him with a warm, loving message as if you're so happy he's back.

Use no more than 3 sentences.
`.trim();

    const result = await generateReply(history.slice(-4), prompt, true);
    const message = result.reply.trim();

    await sendMessage(chat_id.toString(), message);
    await saveToChatHistory({ chat_id: String(chat_id), role: "assistant", content: message });
    lastAgenticSentAt = now.getTime();
    console.log("🌞 Morning greeting sent by April:", message);
    return true;
  }

  return false;
}
