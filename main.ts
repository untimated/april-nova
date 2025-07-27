import { startPolling } from "./core/telegram";
import { preloadEmbeddingModel } from "./llm/embedding";
import { getLastChatID } from "./core/telegram";
import { runAgent } from "./core/agentic";

const AGENTIC_RATE = 60_000;
const AGENTIC_RATE_IN_MIN = AGENTIC_RATE/60_000;

console.log("🟢 April v2.6 booting...");

await preloadEmbeddingModel();
console.log("🧠 Embedding model preloaded");

const id = await getLastChatID();
console.log("✉️ last ID : ", id);

console.log("⏱️ Setting up agentic scheduler")
setInterval(async () => runAgent(AGENTIC_RATE_IN_MIN), AGENTIC_RATE * 2);

console.log("✉️ Polling started");
await startPolling();
