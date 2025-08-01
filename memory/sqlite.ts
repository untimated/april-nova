import { Database } from "bun:sqlite";

// const db = new Database(import.meta.dir + "/april.db");
const db = new Database("april.db");

/*
 * @remark set key value on KV table
 * similar to redis
 * */
export function set(key: string, value: string) {
    console.log("key value set to table kv ", {key, value})
    db.run(`INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)`, [key, value]);
}


/*
 * @remark set key value on KV table
 * similar to redis
 * */
export function get(key: string): string | null {
    const row = db.query(`SELECT value FROM kv WHERE key = ?`).get(key) as { value?: string };
    if(!row) console.log(`key ${key} not found`);
    return row?.value ?? null;
}

export function getDB() {
    return db;
}
