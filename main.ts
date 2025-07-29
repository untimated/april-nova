import { startPolling } from "./core/telegram";
import { preloadEmbeddingModel } from "./llm/embedding";
import { getLastChatID } from "./core/telegram";
import { runAgent } from "./core/agentic";
import { MODEL_BACKEND } from "./config/env";

const AGENTIC_RATE = 60_000;
const AGENTIC_RATE_IN_MIN = AGENTIC_RATE/60_000; // agent execution per 1 minute

console.log("----------------------------");
console.log("🟡 April Nova booting");
console.log("🟡 Model :", MODEL_BACKEND);

await preloadEmbeddingModel();
console.log("🟡 Embedding model preloaded");

// console.log("🟡 Setting up agentic scheduler")
// setInterval(async () => runAgent(AGENTIC_RATE_IN_MIN), AGENTIC_RATE * 2);

console.log("🟢 April Nova Ready");

const id = await getLastChatID();
console.log("✈️ Polling started");
console.log("✉️ last Chat ID : ", id);
console.log("----------------------------");
await startPolling();
