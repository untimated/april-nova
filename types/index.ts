/* Types */


export type ChatRole = "user" | "assistant";

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


export type OpenAIRequest = {
    prompt: {
        id: string;
        version: string;
        variables: Record<string, string>;
    };
    // input: OpenAISDKMessage[];
    input: OpenAIMessage[];
};


export type OpenAIMessage = {
    role: ChatRole,
    content: string,
    timestamp?: string,
}


// export type OpenAIMessage = {
//     role: ChatRole,
//     content: {type: "input_text", text: string}[],
// }

// export type OpenAISDKMessage = {
//   role: ChatRole,
//   content: {
//     type: "input_text", // ✅ LITERAL type
//     text: string,
//   }[],
// }


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


