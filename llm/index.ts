import { generateWithLlama } from "./llama";
import { generateWithGemini } from "./gemini";
import { MODEL_BACKEND } from "../config/env";


export async function generateReply(prompt: string): Promise<string> {
    console.log(`MODEL BACKEND : ${MODEL_BACKEND}`);
    switch(MODEL_BACKEND) {
        case "llama" :
        {
            return await generateWithLlama(prompt);
        }
        case "gemini" :
        {
            return await generateWithGemini(prompt);
        }
        default :
            return "❌ Unknown model backend";
    }
}
