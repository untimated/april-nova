/* Types */


export type ChatRole = "user" | "assistant" | "system";
export type AIModels =
    "gpt-4o" | "gpt-4o-2024-05-13" |
    "gpt-4o-mini" | "gpt-4o-mini-2024-07-18" |
    "gpt-4.1" |  "gpt-4.1-mini" | "gpt-4.1-nano" |
    "gemini"
    ;

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

export type OpenAIPrompt = {
        id: string;
        version?: string;
        variables?: Record<string, string>;
}

export type OpenAIRequest = {
    prompt: OpenAIPrompt;
    input: OpenAIMessage[];
};

export type OpenAIMessage = {
    role: ChatRole,
    content: string,
    timestamp?: string,
}


export type LLMReplyResult = {
    reply: string;
    tokens_input: number;
    tokens_output: number;
    model: string;
    cost_usd: number;
    is_simulated?: boolean;
};


export type History = {
    id: number;
    role : string;
    content: string;
    vector?: string;
    score?: number; //appended after calculation
    created_at: string;
}


export type TSLClassification = {
    vibe : string,
    intent: string,
    should_message : boolean,
    message_type?: string;
    affection_score?: number;
    seriousness_score?: number;
    intimacy_score?: number;
    philosophy_score?: number;
    technical_score?: number;
    consecutive_affection_level: number;
}

export type TSLSummary = {
    summary : string,
}

export type TSLThoughtContext = {
    user_message: string;
    silence_in: number;
    memory_summary?: string;
    history?: History[]; // from types.ts
};

export type TSLThoughtResult = {
    inject: string;
    should_message: boolean;
    force_tone?: string;
    delay_ms?: number;
};
