/* Types */

export type TelegramUpdateResponse = {
    ok: boolean;
    result: {
        update_id: number;
        message?: {
            chat: { id: number };
            text?: string;
        };
    }[];
};

export type GeminiResponse = {
    candidates?: {
        content?: {
            parts?: { text?: string }[]
        }
    }[]

};

export type GeminiError = {
    error: {
        code: number,
        message: string,
        status: string
    }
};


export type OpenAIMessage = {
    role: string,
    content: string
}


export type LLMReplyResult = {
    reply: string;
    tokens_input: number;
    tokens_output: number;
    model: string;
    cost_usd: number;
};


export type History = {
    id: number;
    role : string;
    content: string;
    vector?: string;
    score?: number; //appended after calculation
}

export type ChatRole = "user" | "assistant";
