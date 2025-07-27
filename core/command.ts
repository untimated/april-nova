// commands.ts
import { sendMessage } from "./telegram";
import { set } from "../memory/sqlite"; // kamu sesuaikan path-nya
import { getDB } from "../memory/sqlite";


const helpText =`
🤖 *April Nova v2.6 – Available Commands*

/remember [key] [value] – Store key-value into memory
/usage – Show your token & cost usage for this month
/ping – Check if April is alive
/help – Show this command list

`

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
        case "usage":
        {
            const db = getDB();
            const stmt = db.prepare(`
              SELECT
                SUM(tokens_input) as total_input,
                SUM(tokens_output) as total_output,
                SUM(cost_usd) as total_cost,
                MAX(is_simulated) as is_simulated
              FROM chat_history
              WHERE chat_id = ?
                AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
            `);
            const result : any = await stmt.get(chat_id);

            const input = result?.total_input ?? 0;
            const output = result?.total_output ?? 0;
            const cost = result?.total_cost ?? 0;

            const isSim = !!result?.is_simulated;
            const costText = `$${cost.toFixed(5)}${isSim ? " (simulated)" : ""}`;

            await sendMessage(chat_id,
              `🧾 *Usage this month*\n` +
              `🔠 Input tokens: ${input}\n` +
              `📤 Output tokens: ${output}\n` +
              `💸 Cost: $${costText}`
            );
            return true;
        }
        case "help":
        {
            await sendMessage(chat_id, helpText);
            return true;
        }
        default:
            await sendMessage(chat_id, `❓ Unknown command: /${command}`);
            return true;
    }
}
