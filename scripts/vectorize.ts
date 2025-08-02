import { getDB } from "../memory/sqlite";
import { generateEmbedding } from "../llm/embedding";

(async () => {
  const db = getDB();

  const rows = db.prepare(`
    SELECT id, memory_idea_desc
    FROM memory
    WHERE vector IS NULL
  `).all() as { id: number, memory_idea_desc: string }[];

  console.log(`🧠 Found ${rows.length} unembedded memory entries.`);

  for (const row of rows) {
    try {
      const embedding = await generateEmbedding(row.memory_idea_desc);
      const vec = JSON.stringify(embedding);

      db.prepare(`UPDATE memory SET vector = ? WHERE id = ?`).run(vec, row.id);
      console.log(`✅ Embedded memory ID ${row.id}`);
    } catch (err) {
      console.error(`❌ Failed to embed memory ID ${row.id}:`, err);
    }
  }

  console.log("🏁 Done embedding memory.");
})();
