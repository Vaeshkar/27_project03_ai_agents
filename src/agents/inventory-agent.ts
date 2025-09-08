// src/agents/inventory-agent.ts

import fs from "fs/promises";
import path from "path";
import {
  Product,
  OrderItem,
  OrderSummary,
  StockCheckResult,
  InventoryResponse,
  StoreInfo,
} from "../types/order-types";

interface InventoryData {
  products: { [key: string]: Product };
  store_info: {
    name: string;
    location: string;
    phone: string;
    email: string;
    currency: string;
    tax_rate: number;
    shipping_cost: number;
    free_shipping_threshold: number;
  };
}

export class InventoryAgent {
  private inventoryData: InventoryData | null = null;

  constructor() {
    this.loadInventory();
  }

  private async loadInventory(): Promise<void> {
    try {
      const inventoryPath = path.join(__dirname, "../data/inventory.json");
      const data = await fs.readFile(inventoryPath, "utf-8");
      this.inventoryData = JSON.parse(data);
      console.log("Inventory data loaded successfully");
    } catch (error) {
      console.error("Failed to load inventory:", error);
    }
  }

  // Parse natural language product queries
  private findProductByQuery(query: string): Product | null {
    if (!this.inventoryData) return null;

    const normalizedQuery = query.toLowerCase();

    // Try exact ID match first
    for (const [id, product] of Object.entries(this.inventoryData.products)) {
      if (id.toLowerCase() === normalizedQuery) {
        return product;
      }
    }

    // Try name matching with fuzzy logic
    for (const [id, product] of Object.entries(this.inventoryData.products)) {
      const productName = product.name.toLowerCase();

      // Check if query contains key product words
      if (normalizedQuery.includes("lego") && productName.includes("lego")) {
        if (
          normalizedQuery.includes("creator") &&
          productName.includes("creator")
        )
          return product;
        if (
          normalizedQuery.includes("technic") &&
          productName.includes("technic")
        )
          return product;
      }

      if (
        normalizedQuery.includes("playmobil") &&
        productName.includes("playmobil")
      ) {
        if (
          normalizedQuery.includes("castle") &&
          productName.includes("castle")
        )
          return product;
      }

      if (
        normalizedQuery.includes("monopoly") &&
        productName.includes("monopoly")
      )
        return product;
      if (normalizedQuery.includes("barbie") && productName.includes("barbie"))
        return product;
      if (
        normalizedQuery.includes("hot wheels") &&
        productName.includes("hot wheels")
      )
        return product;

      // Partial name match as fallback
      if (
        productName.includes(normalizedQuery) ||
        normalizedQuery.includes(productName.split(" ")[0])
      ) {
        return product;
      }
    }

    return null;
  }

  // Extract quantity from natural language
  private extractQuantity(query: string): number {
    const quantityMatch = query.match(/(\d+)\s*x?/i);
    return quantityMatch ? parseInt(quantityMatch[1]) : 1;
  }

  // Check stock for a single item
  public checkSingleItem(
    productQuery: string,
    requestedQuantity?: number
  ): StockCheckResult | null {
    const product = this.findProductByQuery(productQuery);
    if (!product) return null;

    const quantity = requestedQuantity || this.extractQuantity(productQuery);

    return {
      available: product.stock >= quantity,
      current_stock: product.stock,
      requested_quantity: quantity,
      product: product,
    };
  }

  // Main inventory checking function
  public async checkInventory(
    items: Array<{ product_query: string; quantity?: number }>
  ): Promise<InventoryResponse> {
    if (!this.inventoryData) {
      await this.loadInventory();
      if (!this.inventoryData) {
        return {
          success: false,
          stock_checks: [],
          message: "Inventory system unavailable",
        };
      }
    }

    const stockChecks: StockCheckResult[] = [];
    const orderItems: OrderItem[] = [];
    const unavailableItems: string[] = [];

    // Check each requested item
    for (const item of items) {
      const stockCheck = this.checkSingleItem(
        item.product_query,
        item.quantity
      );

      if (!stockCheck) {
        unavailableItems.push(`Product not found: "${item.product_query}"`);
        continue;
      }

      stockChecks.push(stockCheck);

      if (stockCheck.available) {
        orderItems.push({
          product_id: stockCheck.product.id,
          product_name: stockCheck.product.name,
          quantity: stockCheck.requested_quantity,
          unit_price: stockCheck.product.price,
          subtotal: stockCheck.product.price * stockCheck.requested_quantity,
        });
      } else {
        unavailableItems.push(
          `${stockCheck.product.name}: Only ${stockCheck.current_stock} in stock (requested ${stockCheck.requested_quantity})`
        );
      }
    }

    // Calculate totals
    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = subtotal * this.inventoryData.store_info.tax_rate;
    const shipping =
      subtotal >= this.inventoryData.store_info.free_shipping_threshold
        ? 0
        : this.inventoryData.store_info.shipping_cost;
    const total = subtotal + tax + shipping;

    // Determine status
    let status: "available" | "partial" | "unavailable" = "available";
    if (orderItems.length === 0) status = "unavailable";
    else if (unavailableItems.length > 0) status = "partial";

    const orderSummary: OrderSummary = {
      items: orderItems,
      subtotal,
      tax,
      shipping,
      total,
      status,
      unavailable_items:
        unavailableItems.length > 0 ? unavailableItems : undefined,
    };

    return {
      success: true,
      order_summary: orderSummary,
      stock_checks: stockChecks,
      message: this.generateInventoryMessage(orderSummary),
    };
  }

  private generateInventoryMessage(orderSummary: OrderSummary): string {
    switch (orderSummary.status) {
      case "available":
        return `All ${
          orderSummary.items.length
        } items are available! Total: €${orderSummary.total.toFixed(2)}`;

      case "partial":
        const available = orderSummary.items.length;
        const unavailable = orderSummary.unavailable_items?.length || 0;
        return `${available} items available, ${unavailable} items unavailable or insufficient stock`;

      case "unavailable":
        return "None of the requested items are available in sufficient quantities";

      default:
        return "Inventory check completed";
    }
  }

  // Get all products (for browsing)
  public async getAllProducts(): Promise<Product[]> {
    if (!this.inventoryData) {
      await this.loadInventory();
    }
    return this.inventoryData ? Object.values(this.inventoryData.products) : [];
  }

  // Search products by category
  public async getProductsByCategory(category: string): Promise<Product[]> {
    const allProducts = await this.getAllProducts();
    return allProducts.filter(
      (product) => product.category.toLowerCase() === category.toLowerCase()
    );
  }

  // Get store information
  public getStoreInfo(): StoreInfo | null {
    return this.inventoryData?.store_info || null;
  }
}

// Create singleton instance
export const inventoryAgent = new InventoryAgent();
