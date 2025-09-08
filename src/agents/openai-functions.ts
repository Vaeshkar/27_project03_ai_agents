// src/agents/openai-functions.ts

export const checkInventoryFunction = {
  type: "function" as const,
  function: {
    name: "check_inventory",
    description: "Check product availability and calculate order totals",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          description: "List of items to check",
          items: {
            type: "object",
            properties: {
              product_query: {
                type: "string",
                description: "Product name or description (e.g., 'LEGO Creator set', 'Playmobil castle')"
              },
              quantity: {
                type: "number",
                description: "Quantity requested",
                default: 1
              }
            },
            required: ["product_query"]
          }
        }
      },
      required: ["items"]
    }
  }
};

export const generateEmailFunction = {
  type: "function" as const,
  function: {
    name: "generate_email",
    description: "Generate customer communication email based on order status",
    parameters: {
      type: "object",
      properties: {
        order_summary: {
          type: "object",
          description: "Order summary from inventory check"
        },
        customer_name: {
          type: "string",
          description: "Customer name for personalization",
          default: "Valued Customer"
        },
        email_type: {
          type: "string",
          enum: ["confirmation", "unavailable", "partial"],
          description: "Type of email to generate"
        }
      },
      required: ["order_summary", "email_type"]
    }
  }
};

export const getStoreInfoFunction = {
  type: "function" as const,
  function: {
    name: "get_store_info",
    description: "Get store information like hours, contact details, policies",
    parameters: {
      type: "object",
      properties: {
        info_type: {
          type: "string",
          enum: ["hours", "contact", "shipping", "returns", "general"],
          description: "Type of store information requested"
        }
      },
      required: ["info_type"]
    }
  }
};

export const updateInventoryFunction = {
  type: "function" as const,
  function: {
    name: "update_inventory",
    description: "Reserve items or update stock levels",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["reserve", "restock", "cancel"],
          description: "Action to perform on inventory"
        },
        order_summary: {
          type: "object",
          description: "Order details for reservation"
        }
      },
      required: ["action"]
    }
  }
};

// All available functions for OpenAI
export const availableFunctions = [
  checkInventoryFunction,
  generateEmailFunction,
  getStoreInfoFunction,
  updateInventoryFunction
];
