import { Database } from "bun:sqlite";
import { generateEmbedding, recallTopSimilar } from "../llm/embedding";
import type { History, ChatRole } from "../types"


const db = new Database(import.meta.dir + "/april.db");
console.log("💾 connected db : ", import.meta.dir + "/april.db");


export function storeMessage(chat_id: number, role: ChatRole, content: string) {
    console.log("storing messages : ", {chat_id, role, content});
    db.run(
        `INSERT INTO chat_history (chat_id, role, content) VALUES (?, ?, ?)`,
        [String(chat_id), role, content]
    );
}


export function getRecentMessages(chat_id: string, limit = 10) : History[] {
    const result = db.prepare(`
          SELECT id, role, content
          FROM chat_history
          WHERE chat_id = ?
          ORDER BY created_at DESC
          LIMIT ?
          `)
    .all(String(chat_id), limit) as History[];
    return result;
}


export async function saveToChatHistory(entry: {
    chat_id: string,
    role: string,
    content: string,
    tokens_input?: number,
    tokens_output?: number,
    model?: string,
    cost_usd?: number,
    is_simulated?: boolean,
}, skip_embedding : boolean = false) {

    let vector: string | null = null;
    if(!skip_embedding) {
        try {
            const vec = await generateEmbedding(entry.content);
            vector = JSON.stringify(vec);
            console.log(`🧬 embedded vector dim = ${vec.length}`);
        } catch (err) {
            console.warn("⚠️ Failed to generate embedding:", err);
        }
    }

    db.run(
        `
        INSERT INTO chat_history
        (chat_id, role, content, tokens_input, tokens_output, model, cost_usd, vector, is_simulated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            entry.chat_id,
            entry.role,
            entry.content,
            entry.tokens_input ?? null,
            entry.tokens_output ?? null,
            entry.model ?? null,
            entry.cost_usd ?? null,
            vector,
            entry.is_simulated ?? 0,
        ]
    );
}


export async function getChatHistory(chat_id : string, user_msg : string) : Promise<History[]> {
    const similar : History[] = await recallTopSimilar(chat_id, user_msg);
    const history : History[] = getRecentMessages(chat_id, 10);
    const mergedHistory : History[] = [...similar, ...history]; // optional dedupe
    // console.log("recalling top similar : ", mergedHistory);
    return mergedHistory;

}
