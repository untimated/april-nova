import { StartPolling } from "./core/telegram";
import { preloadEmbeddingModel } from "./llm/embedding";
import { GetLastChatID } from "./core/telegram";
import { AgenticLoop } from "./core/agentic";
import { MODEL_BACKEND } from "./config/env";

import { Globals } from "./core/globals";


console.log("----------------------------");
console.log("🟡 April Nova booting");
console.log("🟡 Model :", MODEL_BACKEND);

await preloadEmbeddingModel();
console.log("🟡 Embedding model preloaded");

if(MODEL_BACKEND == 'openai') {
    console.log("🟡 Setting up agentic scheduler")
    const minute = 5;
    const id = setInterval(
        async () => AgenticLoop(Globals.States.agentic_interval_minute),
        Globals.States.agentic_interval_ms
    );
    Globals.States.SetAgenticIntervalID(id);

}

console.log("🟢 April Nova Ready");

const id = await GetLastChatID();
console.log("✈️ Polling started");
console.log("✉️ last Chat ID : ", id);
console.log("----------------------------");
await StartPolling();
