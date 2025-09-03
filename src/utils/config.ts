import dotenv from "dotenv";

dotenv.config();

console.log("Environment varables loaded: ");
console.log("NODE_ENV: ", process.env.NODE_ENV);
console.log("PORT: ", process.env.PORT);

export const config = {
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV || "development",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  localModelUrl: process.env.LOCAL_MODEL_URL,
};
