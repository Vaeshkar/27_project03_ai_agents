// src/routes/agent.ts

import { Router, Request, Response } from "express";
import { validateAgentRequest } from "../middleware/validation";
import { AgentRequest, AgentResponse } from "../types";
import { openaiOrchestratorAgent } from "../agents/openai-orchestrator";

const router = Router();

// POST /agent endpoint - AI-Powered Order Management System
router.post(
  "/agent",
  validateAgentRequest,
  async (req: Request, res: Response) => {
    try {
      const { prompt }: AgentRequest = req.body;
      console.log(`🤖 Processing AI-powered request: "${prompt}"`);

      const startTime = Date.now();

      // Process the request through the OpenAI orchestrator
      const orchestratorResponse = await openaiOrchestratorAgent.processOrderRequest(prompt);

      const executionTime = Date.now() - startTime;

      // Build the response in the expected format
      const response: AgentResponse = {
        result: orchestratorResponse.result,
        metadata: {
          agentsUsed: orchestratorResponse.metadata.agentsUsed,
          executionTime: executionTime,
          tokensUsed: orchestratorResponse.metadata.tokensUsed
        }
      };

      // Add additional data if available
      if (orchestratorResponse.order_summary) {
        (response as any).order_summary = orchestratorResponse.order_summary;
      }

      if (orchestratorResponse.email_content) {
        (response as any).email_preview = orchestratorResponse.email_content;
      }

      if (orchestratorResponse.next_actions) {
        (response as any).suggested_actions = orchestratorResponse.next_actions;
      }

      console.log(`✅ AI request processed in ${executionTime}ms using agents: ${orchestratorResponse.metadata.agentsUsed.join(', ')}, tokens: ${orchestratorResponse.metadata.tokensUsed}`);

      res.json(response);

    } catch (error) {
      console.error("AI Agent endpoint error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// GET /status - Get store and system status
router.get(
  "/status",
  async (req: Request, res: Response) => {
    try {
      // Use the old orchestrator for status checks since it's simpler
      const { orchestratorAgent } = await import("../agents/orchestrator");
      const storeStatus = await orchestratorAgent.getStoreStatus();
      res.json({
        status: 'operational',
        ai_mode: 'enabled',
        ...storeStatus
      });
    } catch (error) {
      console.error("Status endpoint error:", error);
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// GET /agent - Simple info endpoint for browser testing
router.get("/agent", (req, res) => {
  res.json({
    message: "🤖 AI-Powered Order Management System Active!",
    system: "Toy Corner - OpenAI-Enhanced Business Assistant",
    ai_features: [
      "Natural language understanding",
      "Smart product matching",
      "Automated order processing",
      "Dynamic customer communications"
    ],
    endpoints: {
      "POST /api/agent": "AI-powered order processing and inquiries",
      "GET /api/status": "System and inventory status"
    },
    example_requests: [
      "I want to order 2 LEGO Creator sets",
      "Do you have any Playmobil castles available?",
      "What are your store hours?",
      "Show me toys for a 6-year-old"
    ],
    usage: {
      method: "POST",
      url: "/api/agent",
      headers: { "Content-Type": "application/json" },
      body: { prompt: "Your natural language request here" }
    }
  });
});

export default router;
