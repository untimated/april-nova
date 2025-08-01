/*
 * @reamark Globals where you store states
 *
 * */

import "../config/env";
import { AgenticLoop } from "./agentic";
import { set } from "../memory/sqlite";


export namespace Globals {

    export namespace States {

        export let agentic_interval_minute = 5;
        export let agentic_interval_ms = 60_000 * agentic_interval_minute;
        export let agentic_interval_id: NodeJS.Timeout;

        export const SetAgenticInterval = (minute : number) => {
            if(minute > 60) {
                throw Error("SetAgenticInterval() : value too big");
            }
            agentic_interval_ms = minute * 60_000;
            agentic_interval_minute = agentic_interval_ms / 60_000;
            console.log({
                agentic_interval_ms,
                agentic_interval_minute
            });

            const id = setInterval(
                async () => AgenticLoop(agentic_interval_minute),
                agentic_interval_ms
            )
            console.warn("Creating new agentic loop...", {agentic_interval_id, id});

            SetAgenticIntervalID(id);
            set('agentic_interval', String(minute));
        }

        export const SetAgenticIntervalID = (id: NodeJS.Timeout) => {
            console.warn("🧹 Clearing existing agentic interval", agentic_interval_id);
            if(agentic_interval_id) {
                clearInterval(agentic_interval_id);
            }
            agentic_interval_id = id;
            console.warn("⌚ New sgentic interval ID assigned", id);
        }

    }

}

