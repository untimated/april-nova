const MILLION = 1_000_000;
const RATES: { [key: string]: { input: number; output: number } } = {
  "gpt-3.5-turbo": { input: 0.50 / MILLION, output: 1.5 / MILLION },
  "gpt-4.1"      : { input: 2.0 / MILLION, output: 8 / MILLION },
  "gpt-4o"       : { input: 2.50 / MILLION, output: 10.0 / MILLION },
  "gpt-4.1-mini" : { input: 0.4 / MILLION, output: 1.6 / MILLION },
  "gpt-4.1-nano" : { input: 0.10 / MILLION, output: 0.40 / MILLION },
  "gemini"       : { input: 0.00025, output: 0 },

  "gpt-4o-2024-05-13" : { input: 2.50 / MILLION, output: 10.0 / MILLION },
};


export function estimateCost(model: string, tokens_input: number, tokens_output: number): number {
  const rate = RATES[model];
  if (!rate) return 0;
  return (tokens_input * rate.input) + (tokens_output * rate.output);
}


