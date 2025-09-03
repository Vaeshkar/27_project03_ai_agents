// src/agents/orchestrator.ts

import { inventoryAgent } from "./inventory-agent";
import { communicationAgent } from "./communication-agent";
import { updateAgent } from "./update-agent";
import { OrderRequest } from "../types/order-types";

interface OrchestratorResponse {
  success: boolean;
  result: string;
  order_summary?: any;
  email_content?: string;
  next_actions?: string[];
  metadata: {
    agentsUsed: string[];
    executionTime: number;
    timestamp: string;
    action_performed: string;
  };
}

export class OrchestratorAgent {
  // Main processing function - analyzes prompt and coordinates agents
  public async processOrderRequest(
    prompt: string,
    customerInfo?: {
      name?: string;
      email?: string;
    }
  ): Promise<OrchestratorResponse> {
    const startTime = Date.now();
    const agentsUsed: string[] = ["orchestrator"];
    let actionPerformed = "analysis";

    try {
      // Step 1: Analyze the prompt to understand intent
      const analysis = this.analyzePrompt(prompt);
      console.log(`Orchestrator analyzing: "${prompt}"`);
      console.log(
        `Detected intent: ${analysis.intent}, Items: ${analysis.items.length}`
      );

      // Step 2: Based on intent, coordinate the appropriate workflow
      switch (analysis.intent) {
        case "order_check":
          return await this.handleOrderCheck(
            analysis,
            agentsUsed,
            startTime,
            customerInfo
          );

        case "place_order":
          return await this.handlePlaceOrder(
            analysis,
            agentsUsed,
            startTime,
            customerInfo
          );

        case "product_inquiry":
          return await this.handleProductInquiry(
            analysis,
            agentsUsed,
            startTime
          );

        case "general_question":
          return await this.handleGeneralQuestion(
            prompt,
            agentsUsed,
            startTime
          );

        default:
          return await this.handleUnknownIntent(prompt, agentsUsed, startTime);
      }
    } catch (error) {
      console.error("Orchestrator error:", error);
      return {
        success: false,
        result:
          "Sorry, I encountered an error processing your request. Please try again.",
        metadata: {
          agentsUsed: ["orchestrator"],
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          action_performed: "error_handling",
        },
      };
    }
  }

  // Analyze user prompt to understand intent and extract items
  private analyzePrompt(prompt: string): {
    intent:
      | "order_check"
      | "place_order"
      | "product_inquiry"
      | "general_question";
    items: Array<{ product_query: string; quantity?: number }>;
    confidence: number;
  } {
    const lowerPrompt = prompt.toLowerCase();

    // Extract items and quantities from the prompt
    const items: Array<{ product_query: string; quantity?: number }> = [];

    // Look for product mentions with quantities
    const productPatterns = [
      /(\d+)\s*(x\s*)?(.+?)(?=\s+and|\s*,|\s*$)/gi,
      /(.+?)\s*x\s*(\d+)/gi,
      /(lego|playmobil|monopoly|barbie|hot wheels)[\w\s-]*/gi,
    ];

    let hasProductMentions = false;

    // Extract quantity + product patterns (e.g., "2 LEGO Creator sets")
    const quantityProductRegex =
      /(\d+)\s*x?\s*([^,\n]+?)(?=\s+and\s+\d+|\s*,\s*\d+|\s*$|and\s|$)/gi;
    let match;

    while ((match = quantityProductRegex.exec(prompt)) !== null) {
      const quantity = parseInt(match[1]);
      const productQuery = match[2].trim();
      if (productQuery.length > 2) {
        items.push({ product_query: productQuery, quantity });
        hasProductMentions = true;
      }
    }

    // Extract standalone product mentions (e.g., "LEGO Creator set")
    if (items.length === 0) {
      const productKeywords = [
        "lego",
        "playmobil",
        "monopoly",
        "barbie",
        "hot wheels",
        "toy",
        "game",
        "set",
      ];
      const words = prompt.toLowerCase().split(/\s+/);

      for (let i = 0; i < words.length; i++) {
        if (
          productKeywords.some((keyword) =>
            words
              .slice(i, i + 3)
              .join(" ")
              .includes(keyword)
          )
        ) {
          // Found product keyword, extract surrounding context
          const startIdx = Math.max(0, i - 1);
          const endIdx = Math.min(words.length, i + 4);
          const productQuery = words.slice(startIdx, endIdx).join(" ");

          if (productQuery.length > 3) {
            items.push({ product_query: productQuery });
            hasProductMentions = true;
            break;
          }
        }
      }
    }

    // Determine intent based on keywords and context
    let intent:
      | "order_check"
      | "place_order"
      | "product_inquiry"
      | "general_question";
    let confidence = 0;

    if (
      lowerPrompt.includes("order") ||
      lowerPrompt.includes("buy") ||
      lowerPrompt.includes("purchase")
    ) {
      if (
        lowerPrompt.includes("confirm") ||
        lowerPrompt.includes("place") ||
        lowerPrompt.includes("complete")
      ) {
        intent = "place_order";
        confidence = 0.9;
      } else {
        intent = "order_check";
        confidence = 0.8;
      }
    } else if (
      hasProductMentions &&
      (lowerPrompt.includes("available") ||
        lowerPrompt.includes("stock") ||
        lowerPrompt.includes("check"))
    ) {
      intent = "order_check";
      confidence = 0.8;
    } else if (hasProductMentions) {
      intent = "product_inquiry";
      confidence = 0.7;
    } else {
      intent = "general_question";
      confidence = 0.5;
    }

    return { intent, items, confidence };
  }

  // Handle order availability checking
  private async handleOrderCheck(
    analysis: any,
    agentsUsed: string[],
    startTime: number,
    customerInfo?: { name?: string; email?: string }
  ): Promise<OrchestratorResponse> {
    console.log("Handling order check...");
    agentsUsed.push("inventory-agent", "communication-agent");

    // Check inventory
    const inventoryResult = await inventoryAgent.checkInventory(analysis.items);

    if (!inventoryResult.success || !inventoryResult.order_summary) {
      return {
        success: false,
        result:
          "Sorry, I could not check inventory at this time. Please try again later.",
        metadata: {
          agentsUsed,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          action_performed: "inventory_check_failed",
        },
      };
    }

    // Generate customer communication
    const emailResponse = communicationAgent.generateConfirmationEmail(
      inventoryResult.order_summary,
      customerInfo?.name
    );

    const nextActions = [];
    if (inventoryResult.order_summary.status === "available") {
      nextActions.push('Reply "CONFIRM ORDER" to place this order');
      nextActions.push("Ask questions about shipping or returns");
    } else if (inventoryResult.order_summary.status === "partial") {
      nextActions.push('Reply "CONFIRM PARTIAL" to order available items only');
      nextActions.push(
        'Reply "WAIT RESTOCK" to be notified when all items are available'
      );
    } else {
      nextActions.push("Browse our available products");
      nextActions.push("Ask for alternative product suggestions");
    }

    return {
      success: true,
      result: `Order check complete! ${inventoryResult.message}`,
      order_summary: inventoryResult.order_summary,
      email_content: emailResponse.body,
      next_actions: nextActions,
      metadata: {
        agentsUsed,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        action_performed: "order_availability_check",
      },
    };
  }

  // Handle actual order placement
  private async handlePlaceOrder(
    analysis: any,
    agentsUsed: string[],
    startTime: number,
    customerInfo?: { name?: string; email?: string }
  ): Promise<OrchestratorResponse> {
    console.log("Handling order placement...");
    agentsUsed.push("inventory-agent", "update-agent", "communication-agent");

    // First check inventory
    const inventoryResult = await inventoryAgent.checkInventory(analysis.items);

    if (!inventoryResult.success || !inventoryResult.order_summary) {
      return {
        success: false,
        result: "Sorry, I could not process your order at this time.",
        metadata: {
          agentsUsed,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          action_performed: "order_placement_failed",
        },
      };
    }

    // If items are available, reserve them
    if (inventoryResult.order_summary.status === "available") {
      const updateResult = await updateAgent.reserveItems(
        inventoryResult.order_summary
      );

      if (updateResult.success) {
        const emailResponse = communicationAgent.generateConfirmationEmail(
          inventoryResult.order_summary,
          customerInfo?.name,
          `TOY-${Date.now()}`
        );

        return {
          success: true,
          result: `Order placed successfully! Items have been reserved. Total: €${inventoryResult.order_summary.total.toFixed(
            2
          )}`,
          order_summary: inventoryResult.order_summary,
          email_content: emailResponse.body,
          next_actions: [
            "Order confirmation sent",
            "Items reserved in inventory",
            "Shipping notification will follow",
          ],
          metadata: {
            agentsUsed,
            executionTime: Date.now() - startTime,
            timestamp: new Date().toISOString(),
            action_performed: "order_placed_and_reserved",
          },
        };
      } else {
        return {
          success: false,
          result: `Order could not be completed: ${updateResult.message}`,
          metadata: {
            agentsUsed,
            executionTime: Date.now() - startTime,
            timestamp: new Date().toISOString(),
            action_performed: "order_reservation_failed",
          },
        };
      }
    } else {
      // Handle partial or unavailable orders
      const emailResponse = communicationAgent.generateConfirmationEmail(
        inventoryResult.order_summary,
        customerInfo?.name
      );

      return {
        success: false,
        result: `Order cannot be completed: ${inventoryResult.message}`,
        order_summary: inventoryResult.order_summary,
        email_content: emailResponse.body,
        metadata: {
          agentsUsed,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          action_performed: "order_placement_unavailable",
        },
      };
    }
  }

  // Handle product inquiries
  private async handleProductInquiry(
    analysis: any,
    agentsUsed: string[],
    startTime: number
  ): Promise<OrchestratorResponse> {
    console.log("Handling product inquiry...");
    agentsUsed.push("inventory-agent");

    if (analysis.items.length === 0) {
      // General product browsing
      const allProducts = await inventoryAgent.getAllProducts();
      const productList = allProducts
        .slice(0, 6) // Show first 6 products
        .map(
          (product) =>
            `• ${product.name} - €${product.price} (${product.stock} in stock)`
        )
        .join("\n");

      return {
        success: true,
        result: `Here are some of our popular toys:\n\n${productList}\n\nWhat type of toy interests you most?`,
        metadata: {
          agentsUsed,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          action_performed: "product_browsing",
        },
      };
    } else {
      // Specific product inquiry
      const inventoryResult = await inventoryAgent.checkInventory(
        analysis.items
      );

      if (inventoryResult.success && inventoryResult.order_summary) {
        const productDetails = inventoryResult.stock_checks
          .map((check) => {
            const product = check.product;
            return `${product.name}\n   Price: €${product.price}\n   Stock: ${product.stock} available\n   Age: ${product.age_range}\n   ${product.description}`;
          })
          .join("\n\n");

        return {
          success: true,
          result: `Here's what I found:\n\n${productDetails}\n\nWould you like to place an order?`,
          metadata: {
            agentsUsed,
            executionTime: Date.now() - startTime,
            timestamp: new Date().toISOString(),
            action_performed: "specific_product_inquiry",
          },
        };
      } else {
        return {
          success: false,
          result:
            "I could not find information about those products. Could you be more specific?",
          metadata: {
            agentsUsed,
            executionTime: Date.now() - startTime,
            timestamp: new Date().toISOString(),
            action_performed: "product_not_found",
          },
        };
      }
    }
  }

  // Handle general questions
  private async handleGeneralQuestion(
    prompt: string,
    agentsUsed: string[],
    startTime: number
  ): Promise<OrchestratorResponse> {
    console.log("Handling general question...");
    agentsUsed.push("communication-agent");

    const response = communicationAgent.generateQuickResponse(prompt);

    return {
      success: true,
      result: response,
      next_actions: [
        "Ask about specific products",
        "Browse our toy categories",
        "Place an order",
      ],
      metadata: {
        agentsUsed,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        action_performed: "general_inquiry_response",
      },
    };
  }

  // Handle unknown intents
  private async handleUnknownIntent(
    prompt: string,
    agentsUsed: string[],
    startTime: number
  ): Promise<OrchestratorResponse> {
    return {
      success: false,
      result:
        "I'm not sure how to help with that. You can ask me to:\n• Check product availability\n• Place orders\n• Get store information\n• Browse our toy selection",
      next_actions: [
        "Try asking about specific toys",
        "Ask about store hours or shipping",
        "Browse product categories",
      ],
      metadata: {
        agentsUsed,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        action_performed: "unknown_intent",
      },
    };
  }

  // Get store status and alerts
  public async getStoreStatus(): Promise<any> {
    const lowStockAlerts = await updateAgent.generateRestockAlerts(3);
    const currentStock = await updateAgent.getCurrentStock();
    const storeInfo = inventoryAgent.getStoreInfo();

    return {
      store_info: storeInfo,
      low_stock_alerts: lowStockAlerts,
      total_products: Object.keys(currentStock).length,
      timestamp: new Date().toISOString(),
    };
  }
}

// Create singleton instance
export const orchestratorAgent = new OrchestratorAgent();
