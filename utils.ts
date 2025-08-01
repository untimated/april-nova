import type { History } from "./types";

// Get current time in WIB, formatted like "Kamis, 23:53 WIB"
export function GetCurrentWIBTime(): string {
    return new Date().toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZoneName: "short",
    });
}

// Convert UTC date string (e.g. "2025-07-31 16:39:51") to WIB local time
export function ConvertUTCToWIB(dateStr?: string | null): string {
    if (!dateStr) return GetCurrentWIBTime();

    const utc = new Date(dateStr + "Z"); // force UTC parsing
    return utc.toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour12: false,
    });
}

export function ChatToString(history : History[]) {
    const compiled = history.map(h => `${h.role === "user" ? "User" : "Assistant"}: [${ConvertUTCToWIB(h.created_at)}]${h.content}`).join("\n");
    return compiled;
}


export const TimeForPrompt = (now: Date) => {
    return now.toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export const DateForPrompt = (now: Date) => {
    return now.toLocaleDateString("id-ID", {
        timeZone: "Asia/Jakarta",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

