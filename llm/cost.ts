import type { AIModels } from "../types"

type Models = keyof AIModels;

const MILLION = 1_000_000;
const RATES:  Record< AIModels, { input: number; output: number }> = {
  // "gpt-3.5-turbo": { input: 0.50 / MILLION, output: 1.5 / MILLION },

  "gpt-4o"       : { input: 2.50 / MILLION, output: 10.0 / MILLION },
  "gpt-4o-2024-05-13" : { input: 2.50 / MILLION, output: 10.0 / MILLION },
  "gpt-4o-2024-08-06" : { input: 2.50 / MILLION, output: 10.0 / MILLION },
  "gpt-4o-2024-11-20" : { input: 2.50 / MILLION, output: 10.0 / MILLION },
  "gpt-4o-mini"  : { input: 0.15 / MILLION, output: 0.60 / MILLION },
  "gpt-4o-mini-2024-07-18"  : { input: 0.15 / MILLION, output: 0.60 / MILLION },

  "gpt-4.1"      : { input: 2.0 / MILLION, output: 8 / MILLION },
  "gpt-4.1-mini" : { input: 0.4 / MILLION, output: 1.6 / MILLION },
  "gpt-4.1-nano" : { input: 0.10 / MILLION, output: 0.40 / MILLION },

  "gemini"       : { input: 0.00025, output: 0 },

};


export function estimateCost(model: AIModels, tokens_input: number, tokens_output: number): number {
    let rate = RATES[model];
    if (!rate) {
        if(model.includes("gpt-4o")) {
            rate = RATES['gpt-4o'];
        }else{
            return 0;
        }
    }
    return (tokens_input * rate.input) + (tokens_output * rate.output);
}


