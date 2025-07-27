const RATES : {[key:string]: any} = {
  "gpt-3.5": { input: 0.0005 / 1000, output: 0.0015 / 1000 },
  "gpt-4": { input: 0.01 / 1000, output: 0.03 / 1000 },
  "gemini": { input: 0.00025, output: 0 }, // flat rate? adjust if needed
};


export function estimateCost(model: string, tokens_input: number, tokens_output: number): number {
  const rate = RATES[model];
  if (!rate) return 0;
  return (tokens_input * rate.input) + (tokens_output * rate.output);
}


