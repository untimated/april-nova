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
