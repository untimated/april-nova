/*
 * @remark Global runtime states and mutators
 */

import "../config/env";
import { AgenticLoop } from "./agentic";
import { set } from "../memory/sqlite";

export const Global = {
    state: {
        agentic_interval_minute: 1,
        agentic_interval_ms: 60_000 * 1,
        agentic_interval_id: undefined as NodeJS.Timeout | undefined,

        max_spam_allowed: 3,
        spam_protect_count: 0,
    },

    mutator: {
        SetAgenticInterval(minute: number) {
            if (minute > 60) {
                throw new Error("SetAgenticInterval() : value too big");
            }

            Global.state.agentic_interval_minute = minute;
            Global.state.agentic_interval_ms = minute * 60_000;

            console.log({
                agentic_interval_ms: Global.state.agentic_interval_ms,
                agentic_interval_minute: Global.state.agentic_interval_minute,
            });

            const id = setInterval(
                async () => AgenticLoop(Global.state.agentic_interval_minute),
                Global.state.agentic_interval_ms
            );

            console.warn("Creating new agentic loop...", {
                old: Global.state.agentic_interval_id,
                new: id,
            });

            Global.mutator.SetAgenticIntervalID(id);
            set("agentic_interval", String(minute));
        },

        SetAgenticIntervalID(id: NodeJS.Timeout) {
            const prev = Global.state.agentic_interval_id;
            if (prev) clearInterval(prev);
            Global.state.agentic_interval_id = id;

            console.warn("⌚ New agentic interval ID assigned", id);
        },

        ResetSpamCount() {
            Global.state.spam_protect_count = 0;
        },

        IncrementSpam(n = 1) {
            Global.state.spam_protect_count += n;
        },
    },
};
