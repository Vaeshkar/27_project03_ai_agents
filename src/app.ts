import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./utils/config";
import agentRouter from "./routes/agent";

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api", agentRouter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// Error handling middleware
app.use(
  (
    error: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Unhandled error:", error);
    res.status(500).json({
      error: "Internal server error",
      details:
        config.nodeEnv === "development"
          ? error.message
          : "Something went wrong.",
    });
  }
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint Not Found",
    details: "The requested endpoint does not exist.",
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Agent endpoint: http://localhost:${PORT}/api/agent`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

export default app;
