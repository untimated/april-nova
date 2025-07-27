import { Database } from "bun:sqlite";

console.log("connecting db ", import.meta.dir + "/april.db");
const db = new Database(import.meta.dir + "/april.db");

export type ChatRole = "user" | "assistant";

export function storeMessage(chat_id: number, role: ChatRole, content: string) {
    console.log("storing messages : ", {chat_id, role, content});
    db.run(
        `INSERT INTO chat_history (chat_id, role, content) VALUES (?, ?, ?)`,
        [String(chat_id), role, content]
    );
    // const result = db.prepare(`
    //       SELECT *
    //       FROM chat_history
    //       `)
    // .all();
    // console.log("inserted : ", result);
}

export function getRecentMessages(chat_id: number, limit = 10) {
    const result = db.prepare(`
          SELECT role, content
          FROM chat_history
          WHERE chat_id = ?
          ORDER BY created_at DESC
          LIMIT ?
          `)
    .all(String(chat_id), limit) as { role: ChatRole; content: string }[];
    return result;
}

