console.log("Environment variables loaded:");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "Set" : "Not set");

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  localModelUrl: process.env.LOCAL_MODEL_URL || "http://localhost:1234/v1",
};
