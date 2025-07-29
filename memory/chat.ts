import { Database } from "bun:sqlite";
import { generateEmbedding, recallTopSimilar } from "../llm/embedding";
import type { History, ChatRole } from "../types"


const db = new Database(import.meta.dir + "/april.db");
console.log("💾 connected db : ", import.meta.dir + "/april.db");


export async function getChatHistory(limit : number, role? : ChatRole, sort_by = "DESC") : Promise<History[]> {
    return getMessages(limit, role, sort_by).reverse();
}


export async function getChatHistoryWithVectorSimilarity(compared_data : string, limit : number) : Promise<History[]> {
    const similar : History[] = await recallTopSimilar(compared_data);
    const history : History[] = getMessages(limit).reverse();
    const mergedHistory : History[] = [...similar, ...history];
    return mergedHistory;

}


export function getMessages(limit : number, role? : ChatRole, sort_by : string = 'DESC') : History[] {
    let params : {[key: string] : any }= {
        ":limit" : limit,
    }
    if(role) params[":role"] = role;
    let query = `
      SELECT *
      FROM chat_history
      ${ role ? 'WHERE role = :role' : ''}
      ORDER BY id ${sort_by}
      LIMIT :limit;
    `;
    const result = db.prepare(query).all(params) as History[];
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


