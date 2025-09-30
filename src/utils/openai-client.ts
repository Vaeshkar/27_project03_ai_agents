import OpenAI from "openai";
import { config } from "./config";

export function getOpenAIClient(): OpenAI {
  if (config.nodeEnv === "development") {
    // Use local model in development (LM Studio/Ollama)
    console.log("Using local model at:", config.localModelUrl);
    return new OpenAI({
      baseURL: config.localModelUrl,
      apiKey: "not-needed", // Local models often don't need real API keys
    });
  } else {
    // Use OpenAI in production
    console.log("Using OpenAI API");
    return new OpenAI({
      apiKey: config.openaiApiKey,
    });
  }
}

export const openaiClient = getOpenAIClient();
