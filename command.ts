// commands.ts
import { sendMessage } from "./telegram";
import { set } from "./memory/sqlite"; // kamu sesuaikan path-nya

export async function handleCommand(chat_id: string, user_msg: string): Promise<boolean> {
    const match = user_msg.trim().match(/^\/(\w+)(?:\s+(.*))?$/);
    if (!match) return false;

    const command = match[1]!.toLowerCase();
    const args = match[2];

    console.log("user command : ", {command, args, user_msg});

    switch (command) {
        case "remember": {
            const [key, ...valueParts] = args!.split(" ");
            const value = valueParts.join(" ");

            if (!key || !value) {
                await sendMessage(chat_id, `⚠️ Format salah. Pakai: /remember key value`);
                return true;
            }

            set(key, value);
            await sendMessage(chat_id, `📝 Remembered: ${key} = ${value}`);
            return true;
        }

        case "ping":
            await sendMessage(chat_id, "🏓 Pong!");
            return true;

        default:
            await sendMessage(chat_id, `❓ Unknown command: /${command}`);
            return true;
    }
}
