import { StartPolling } from "./core/telegram";
import { preloadEmbeddingModel } from "./llm/embedding";
import { GetLastChatID } from "./core/telegram";
import { AgenticLoop } from "./core/agentic";
import { MODEL_BACKEND } from "./config/env";

import { Global } from "./core/globals";


console.log("----------------------------");
console.log("🟡 April Nova booting");
console.log("🟡 Model :", MODEL_BACKEND);

await preloadEmbeddingModel();
console.log("🟡 Embedding model preloaded");

if(MODEL_BACKEND == 'openai') {
    console.log("🟡 Setting up agentic scheduler")
    const id = setInterval(
        async () => AgenticLoop(Global.state.agentic_interval_minute),
        Global.state.agentic_interval_ms
    );
    Global.mutator.SetAgenticIntervalID(id);
}

console.log("🟢 April Nova Ready");

const id = await GetLastChatID();
console.log("✈️ Polling started");
console.log("✉️ last Chat ID : ", id);
console.log("----------------------------");
await StartPolling();
