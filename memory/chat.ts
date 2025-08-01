import { generateEmbedding, recallMostSimilar, recallTopSimilar } from "../llm/embedding";
import type { History, ChatRole } from "../types"
import {getDB} from "./sqlite";



export async function getChatHistory(limit : number, role? : ChatRole, sort_by = "DESC") : Promise<History[]> {
    return getMessages(limit, role, sort_by).reverse();
}


export async function getChatHistoryWithVectorSimilarity(compared_data : string, limit : number) : Promise<History[]> {
    const similar : History[] = await recallMostSimilar(compared_data);
    const history : History[] = getMessages(limit).reverse();
    const mergedHistory : History[] = [...similar, ...history];
    return mergedHistory;

}


export function getMessages(limit : number, role? : ChatRole, sort_by : string = 'DESC') : History[] {
    const db = getDB();
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
    chat_type?: 'voicemail' | 'standard',
    is_simulated?: boolean,
}, skip_embedding : boolean = false) {

    const db = getDB();
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
        (chat_id, role, content, tokens_input, tokens_output, model, cost_usd, vector, is_simulated, type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            entry.chat_type ?? 'standard'
        ]
    );
}


