import "dotenv/config";

if (!process.env.TELEGRAM_TOKEN) throw new Error("TELEGRAM_TOKEN is missing");
if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing");
export const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN!;
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

export const MODEL_BACKEND = process.env.MODEL_BACKED;
