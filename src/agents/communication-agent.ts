// src/agents/communication-agent.ts

import { OrderSummary, EmailResponse } from "../types/order-types";

export class CommunicationAgent {
  // Generate order confirmation email
  public generateConfirmationEmail(
    orderSummary: OrderSummary,
    customerName?: string,
    orderNumber?: string
  ): EmailResponse {
    const name = customerName || "Valued Customer";
    const orderRef = orderNumber || `TOY-${Date.now()}`;

    switch (orderSummary.status) {
      case "available":
        return this.generateAvailableOrderEmail(orderSummary, name, orderRef);

      case "partial":
        return this.generatePartialOrderEmail(orderSummary, name, orderRef);

      case "unavailable":
        return this.generateUnavailableOrderEmail(orderSummary, name, orderRef);

      default:
        return {
          subject: "Order Status Update",
          body: "We are processing your order request.",
          type: "confirmation",
        };
    }
  }

  private generateAvailableOrderEmail(
    orderSummary: OrderSummary,
    customerName: string,
    orderRef: string
  ): EmailResponse {
    const itemsList = orderSummary.items
      .map(
        (item) =>
          `• ${item.quantity}x ${item.product_name} - €${item.subtotal.toFixed(
            2
          )}`
      )
      .join("\n");

    const body = `
Dear ${customerName},

Great news! All items in your order are available and ready for processing.

ORDER CONFIRMATION
Order Reference: ${orderRef}
Date: ${new Date().toLocaleDateString("en-GB")}

ITEMS ORDERED:
${itemsList}

ORDER SUMMARY:
Subtotal: €${orderSummary.subtotal.toFixed(2)}
Tax (21%): €${orderSummary.tax.toFixed(2)}
Shipping: €${orderSummary.shipping.toFixed(2)}${
      orderSummary.shipping === 0 ? " (Free shipping!)" : ""
    }
---
TOTAL: €${orderSummary.total.toFixed(2)}

NEXT STEPS:
Your order is ready for processing. We will prepare your items and send shipping confirmation within 1-2 business days.

STORE DETAILS:
Toy Corner
Alphen aan den Rijn
Phone: +31 123 456 789

Thank you for choosing Toy Corner! We hope you and your children will love these toys.

Best regards,
The Toy Corner Team

---
Reply 'CONFIRM ORDER' to proceed with payment and shipping.
    `.trim();

    return {
      subject: `Order Confirmation ${orderRef} - All Items Available!`,
      body,
      type: "confirmation",
    };
  }

  private generatePartialOrderEmail(
    orderSummary: OrderSummary,
    customerName: string,
    orderRef: string
  ): EmailResponse {
    const availableItemsList = orderSummary.items
      .map(
        (item) =>
          `• ${item.quantity}x ${item.product_name} - €${item.subtotal.toFixed(
            2
          )}`
      )
      .join("\n");

    const unavailableList =
      orderSummary.unavailable_items?.map((item) => `• ${item}`).join("\n") ||
      "";

    const body = `
Dear ${customerName},

We've checked your order and have good news and some limitations to share.

ORDER STATUS: PARTIALLY AVAILABLE
Order Reference: ${orderRef}
Date: ${new Date().toLocaleDateString("en-GB")}

AVAILABLE ITEMS:
${availableItemsList}

UNAVAILABLE ITEMS:
${unavailableList}

AVAILABLE ITEMS TOTAL:
Subtotal: €${orderSummary.subtotal.toFixed(2)}
Tax (21%): €${orderSummary.tax.toFixed(2)}
Shipping: €${orderSummary.shipping.toFixed(2)}${
      orderSummary.shipping === 0 ? " (Free shipping!)" : ""
    }
---
TOTAL: €${orderSummary.total.toFixed(2)}

YOUR OPTIONS:
1. Proceed with available items only
2. Wait for restock (we'll notify you when items arrive)
3. Choose alternative products

STORE DETAILS:
Toy Corner - Alphen aan den Rijn
Phone: +31 123 456 789

We apologize for any inconvenience and appreciate your understanding.

Best regards,
The Toy Corner Team

---
Reply 'CONFIRM PARTIAL' to proceed with available items only, or 'WAIT RESTOCK' to be notified when all items are available.
    `.trim();

    return {
      subject: `Order ${orderRef} - Some Items Available`,
      body,
      type: "partial",
    };
  }

  private generateUnavailableOrderEmail(
    orderSummary: OrderSummary,
    customerName: string,
    orderRef: string
  ): EmailResponse {
    const unavailableList =
      orderSummary.unavailable_items?.map((item) => `• ${item}`).join("\n") ||
      "";

    const body = `
Dear ${customerName},

Thank you for your interest in our products. Unfortunately, we need to inform you about your recent order request.

ORDER STATUS: ITEMS UNAVAILABLE
Order Reference: ${orderRef}
Date: ${new Date().toLocaleDateString("en-GB")}

UNAVAILABLE ITEMS:
${unavailableList}

WHAT WE CAN DO FOR YOU:
• Check back in a few days - we restock regularly
• Browse our available products online or in-store
• Sign up for restock notifications
• Consider similar alternative products

VISIT OUR STORE:
Toy Corner
Alphen aan den Rijn
Phone: +31 123 456 789

We have many other wonderful toys in stock that might interest you! Feel free to visit our store or call us for personalized recommendations.

RESTOCK NOTIFICATIONS:
We'll be happy to notify you when these items become available again.

We apologize for any disappointment and hope to serve you soon with other amazing toys!

Best regards,
The Toy Corner Team

---
Reply 'ALTERNATIVES' to see similar products, or 'NOTIFY RESTOCK' to get updates when these items return.
    `.trim();

    return {
      subject: `Order ${orderRef} - Items Currently Unavailable`,
      body,
      type: "unavailable",
    };
  }

  // Generate simple response for quick queries
  public generateQuickResponse(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("hours") || lowerMessage.includes("open")) {
      return "Our store is open Monday-Saturday 9:00-18:00, Sunday 12:00-17:00. Online orders are processed 24/7!";
    }

    if (
      lowerMessage.includes("shipping") ||
      lowerMessage.includes("delivery")
    ) {
      return "We offer free shipping on orders over €50! Standard shipping is €4.95 and takes 1-3 business days.";
    }

    if (lowerMessage.includes("return") || lowerMessage.includes("exchange")) {
      return "Items can be returned within 14 days of purchase in original packaging. Store credit or exchanges are always possible!";
    }

    if (lowerMessage.includes("age") || lowerMessage.includes("suitable")) {
      return "All our toys include age recommendations. Feel free to ask about specific products - we're happy to help you choose age-appropriate toys!";
    }

    return "Thank you for contacting Toy Corner! For specific product questions, orders, or store information, please call us at +31 123 456 789 or visit our store in Alphen aan den Rijn.";
  }

  // Generate shipping notification
  public generateShippingNotification(
    orderNumber: string,
    trackingNumber: string,
    customerName?: string
  ): EmailResponse {
    const name = customerName || "Valued Customer";

    const body = `
Dear ${name},

Great news! Your order has been shipped and is on its way to you!

SHIPPING DETAILS:
Order Reference: ${orderNumber}
Tracking Number: ${trackingNumber}
Estimated Delivery: 1-3 business days

You can track your package using the tracking number above with our shipping partner.

We hope you and your children will love your new toys!

Best regards,
The Toy Corner Team
    `.trim();

    return {
      subject: `Your Order ${orderNumber} Has Shipped!`,
      body,
      type: "confirmation",
    };
  }
}

// Create singleton instance
export const communicationAgent = new CommunicationAgent();
