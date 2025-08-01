import { GenerateWithOpenAI } from "./openai";
import { TimeForPrompt, DateForPrompt, ChatToString } from "../utils";
import type { OpenAIRequest, TSLClassification, TSLSummary, AIModels, History, OpenAIPrompt } from "../types";


const classifier_input = `
Classify this message:
"""
:text_here
"""`
;

const summarizer_input = `
Summarize this message:
"""
:text_here
"""`;


function TSLPrompt(id: string, version: string | null, content: string): OpenAIRequest {
    const now = new Date();
    let prompt : OpenAIPrompt = {
        id,
        variables: { time: TimeForPrompt(now), date: DateForPrompt(now) }
    }
    if(version) prompt['version'] = version;
    return {
        prompt,
        input: [{ role: "user", content }]
    }
}


export namespace TSL.OpenAI {

    const classifier_prompt_id = "pmpt_6888e07a0a78819799d5f8ed47879a9b0e388b898b43d8e8";
    const summarizer_prompt_id = "pmpt_6888d1374e0c81939a709eba751dbd7f05ef4d8fa5663fce";

    export async function Classifier(text: string, model : AIModels): Promise<TSLClassification> {
        const prompt = TSLPrompt(classifier_prompt_id, null, classifier_input.replace(":text_here", text));
        const result = await GenerateWithOpenAI(prompt.input, prompt.prompt, true, model, 0.2);
        console.log('classifier : ', {prompt, result});
        try {
            const parsed = JSON.parse(result.reply);
            return parsed;
        } catch (e) {
            console.error("Classifier parse error:", e);
            throw e;
        }
    }


    export async function Summarizer(text: string, model: AIModels): Promise<TSLSummary> {
        const prompt = TSLPrompt(summarizer_prompt_id, null, summarizer_input.replace(":text_here", text));
        const result = await GenerateWithOpenAI(prompt.input, prompt.prompt, true, model, 0.2);
        try {
            console.log('summarizer : ', {prompt, result});
            return { summary : result.reply }
        } catch (e) {
            console.error("Summarizer parse error:", e);
            return {
                summary: "(unable to summarize)"
            };
        }
    }


    export async function ThoughtChain(userMessage: string, history: History[]): Promise<{
        inject: string;
        should_message: boolean;
        escalate_model: boolean;
    }> {

        try {

            const compiled = ChatToString(history);
            let promises : Promise<any>[] = [
                Classifier(compiled + `\nuser: ${userMessage}`, 'gpt-4.1-nano')
            ];

            if(history.length > 0) {
                const compiled = history.map(h => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`).join("\n");
                promises.push(Summarizer(compiled, 'gpt-4.1-nano'));
            }

            let [classification, summarization] = await Promise.all(promises);

            const inject = `Mood: ${classification.vibe}.\n Intent: ${classification.intent}.\n Summary: ${summarization?.summary ?? "-"}.\n `;

            const {
                affection_score = 0,
                intimacy_score = 0,
                philosophy_score = 0,
                seriousness_score = 0,
                technical_score = 0,
                consecutive_affection_level = 0
            } = classification;


            const escalate_model =
                consecutive_affection_level < 6.5 && (
                affection_score > 0.6 ||
                intimacy_score > 0.6 ||
                philosophy_score > 0.5 ||
                (seriousness_score > 0.7 && technical_score > 0.5)
            );

            const should_message = classification.should_message

            console.log({classification, summarization, escalate_model, should_message});

            return {
                inject,
                should_message,
                escalate_model
            };

        } catch (error) {
            throw error;
        }

    }


}
