import { Database } from "bun:sqlite";
import { generateEmbedding, recallTopSimilar } from "../llm/embedding";
import type { History, ChatRole } from "../types"


const db = new Database(import.meta.dir + "/april.db");
console.log("💾 connected db : ", import.meta.dir + "/april.db");


/* export function storeMessage(chat_id: number, role: ChatRole, content: string) {
    console.log("storing messages : ", {chat_id, role, content});
    db.run(
        `INSERT INTO chat_history (chat_id, role, content) VALUES (?, ?, ?)`,
        [String(chat_id), role, content]
    );
} */

export async function getChatHistory(limit : number, role? : ChatRole) : Promise<History[]> {
    if(role) {
        const history : History[] = getRecentMessages(limit, role);
        return history;
    }
    const history : History[] = getRecentMessages(limit);
    return history;
}


export async function getChatHistoryWithVectorSimilarity(chat_id : string, compared_data : string, length : number) : Promise<History[]> {
    const similar : History[] = await recallTopSimilar(chat_id, compared_data);
    const history : History[] = getRecentMessages(length);
    const mergedHistory : History[] = [...similar, ...history];
    return mergedHistory;

}


export function getRecentMessages(limit = 10, role? : ChatRole) : History[] {
    if(role) {
        const result = db.prepare(`
              SELECT *
              FROM chat_history
              WHERE role = ?
              ORDER BY created_at DESC
              LIMIT ?;
              `)
        .all(role, limit) as History[];
        console.log("recent messages", result);
        return result;
    }
    const result = db.prepare(`
          SELECT id, chat_id, content, created_at, tokens_input, tokens_output, cost_usd, model, is_simulated
          FROM chat_history
          ORDER BY created_at DESC
          LIMIT ?;
          `)
    .all(limit) as History[];
    console.log("recent messages", result);
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
            // console.log(`🧬 embedded vector dim = ${vec.length}`);
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


