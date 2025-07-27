import { set } from "./memory/sqlite";

export async function handleMessage(text: string): Promise<string> {
    if (text.startsWith("/remember ")) {
        const payload = text.slice(10).trim();
        const [key, ...rest] = payload.split(" ");
        const value = rest.join(" ");

        if (!key || !value) return "❗ Format: /remember <key> <value>";

        set(key, value);
        return `📌 Noted: "${key}" → "${value}"`;
    }

    return `🤖 Echo: ${text}`;
}
