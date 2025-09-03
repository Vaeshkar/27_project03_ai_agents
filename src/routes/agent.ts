// src/routes/agent.ts

import { Router, Request, Response } from "express";
import { validateAgentRequest } from "../middleware/validation";
import { AgentRequest, AgentResponse } from "../types";
import { orchestratorAgent } from "../agents/orchestrator";

const router = Router();

// POST /agent endpoint - Main AI Order Management System
router.post(
  "/agent",
  validateAgentRequest,
  async (req: Request, res: Response) => {
    try {
      const { prompt }: AgentRequest = req.body;
      console.log(`Processing order request: "${prompt}"`);

      const startTime = Date.now();

      // Process the request through the orchestrator
      const orchestratorResponse = await orchestratorAgent.processOrderRequest(
        prompt
      );

      const executionTime = Date.now() - startTime;

      // Build the response in the expected format
      const response: AgentResponse = {
        result: orchestratorResponse.result,
        metadata: {
          agentsUsed: orchestratorResponse.metadata.agentsUsed,
          executionTime: executionTime,
          tokensUsed: 0, // We'll add this later with OpenAI integration
        },
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

      console.log(
        `Request processed in ${executionTime}ms using agents: ${orchestratorResponse.metadata.agentsUsed.join(
          ", "
        )}`
      );

      res.json(response);
    } catch (error) {
      console.error("Agent endpoint error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// GET /status - Get store and system status
router.get("/status", async (req: Request, res: Response) => {
  try {
    const storeStatus = await orchestratorAgent.getStoreStatus();
    res.json({
      status: "operational",
      ...storeStatus,
    });
  } catch (error) {
    console.error("Status endpoint error:", error);
    res.status(500).json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /agent - Simple info endpoint for browser testing
router.get("/agent", (req, res) => {
  res.json({
    message: "AI Order Management System Active!",
    system: "Toy Corner - Local Business AI Assistant",
    endpoints: {
      "POST /api/agent": "Process order requests and inquiries",
      "GET /api/status": "Get store and system status",
    },
    example_requests: [
      "I want to order 2 LEGO Creator sets",
      "Check availability of Playmobil castle",
      "What are your store hours?",
      "Show me available board games",
    ],
    usage: {
      method: "POST",
      url: "/api/agent",
      headers: { "Content-Type": "application/json" },
      body: { prompt: "Your request here" },
    },
  });
});

export default router;
