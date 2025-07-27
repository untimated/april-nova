import { startPolling } from "./telegram";
import { preloadEmbeddingModel } from "./llm/embedding";

console.log("🟢 April v2.6 booting...");

await preloadEmbeddingModel();
console.log("🧠 Embedding model preloaded");

console.log("✉️ Polling started");
await startPolling();
