import type { History, Memory } from '../types';
import { pipeline, type Chat } from '@xenova/transformers';
import { getDB } from '../memory/sqlite';

let embedder: any = null;


function cosineSimilarity(a: number[], b: number[]): number {
    if(a.length > 0 && b.length > 0) {
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i]! * b[i]!;
            normA += a[i]! ** 2;
            normB += b[i]! ** 2;
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    return 0;
}


export async function preloadEmbeddingModel() {
    if (!embedder) {
        console.log("🧬 Preloading embedding model...");
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log("✅ Embedding model ready.");
    }
}


export async function generateEmbedding(text: string): Promise<number[]> {
    if (!embedder) {
        console.log("🔄 Loading embedding model...");
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log("✅ Embedding model loaded.");
    }

    const output = await embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);

}


export async function RecallMostSimilar(
    text: string,
    limit: number = 1,
    threshold: number = 0.5
): Promise<History[]> {
    const top = await RecallTopSimilar(text, limit, threshold);
    return top;
}


export async function RecallTopSimilar(
    text: string,
    topN: number = 3,
    threshold: number = 0
): Promise<(History & { score: number })[]> {
    const db = getDB();
    const targetVec = await generateEmbedding(CleanInput(text));

    const rows = db.prepare(`
        SELECT *
        FROM chat_history
        WHERE vector IS NOT NULL
    `).all() as History[];

    const scored = rows.map((row) => {
        try {
            const vec = JSON.parse(row.vector ?? "[]");
            const score = cosineSimilarity(targetVec, vec);
            return { ...row, score };
        } catch {
            return null;
        }
    }).filter((r): r is History & { score: number } => !!r && r.score >= threshold)
    .sort((a, b) => b.score - a.score);

    console.table([{prompt_to_compare : text}])
    console.table(scored.map(x => ({
      id: x.id,
      score: x.score,
      content: x.content.slice(0, 50),
    })));

    return scored.slice(0, topN);
}


export async function RecallTopMemorySimilar(
    text: string,
    topK: number = 3,
    threshold: number = 0
): Promise<Memory[]> {

    const db = getDB();
    const targetVec = await generateEmbedding(CleanInput(text));

    const rows = db.prepare(`
        SELECT id, type, title, memory_idea_desc, vector, date_created
        FROM memory
        WHERE vector IS NOT NULL
        `).all() as Memory[];

    const scored = rows
    .map((row) => {
        try {
            const vec = JSON.parse(row.vector ?? "[]");
            const similarity = cosineSimilarity(targetVec, vec);
            return { ...row, similarity };
        } catch {
            return null;
        }
    })
    .filter((r): r is Memory & { similarity: number } => !!r && r.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);

    console.table([{ prompt_to_compare: text }]);
    console.table(
        scored.map((x) => ({
            id: x.id,
            similarity: x.similarity,
            title: x.title,
            preview: x.memory_idea_desc.slice(0, 50),
        }))
    );

    return scored.slice(0, topK);
}


function CleanInput(text: string): string {
    return text
        .toLowerCase()
        .replace(/(beb|🥺|😚|rebahan|peluk|backup|offline|bareng|wkwk|aku|kamu|sayang|cinta|🥰|💤)/gi, "")
        .replace(/[^\w\s]/g, "")  // remove non-words
        .replace(/\s+/g, " ")     // normalize whitespace
        .trim();
}
