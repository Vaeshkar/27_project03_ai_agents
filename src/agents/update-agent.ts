// src/agents/update-agent.ts

import fs from "fs/promises";
import path from "path";
import { OrderSummary, UpdateResult } from "../types/order-types";

interface InventoryData {
  products: { [key: string]: any };
  store_info: any;
}

export class UpdateAgent {
  private inventoryPath: string;

  constructor() {
    this.inventoryPath = path.join(__dirname, "../data/inventory.json");
  }

  private async loadInventory(): Promise<InventoryData | null> {
    try {
      const data = await fs.readFile(this.inventoryPath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Failed to load inventory for update:", error);
      return null;
    }
  }

  private async saveInventory(data: InventoryData): Promise<boolean> {
    try {
      await fs.writeFile(this.inventoryPath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error("Failed to save inventory:", error);
      return false;
    }
  }

  // Reserve items (reduce stock temporarily)
  public async reserveItems(orderSummary: OrderSummary): Promise<UpdateResult> {
    if (
      orderSummary.status !== "available" &&
      orderSummary.status !== "partial"
    ) {
      return {
        success: false,
        updated_products: [],
        message: "Cannot reserve items - order not available",
      };
    }

    const inventoryData = await this.loadInventory();
    if (!inventoryData) {
      return {
        success: false,
        updated_products: [],
        message: "Inventory system unavailable",
      };
    }

    const updatedProducts: Array<{
      product_id: string;
      old_stock: number;
      new_stock: number;
    }> = [];

    // Check if all items are still available before making any changes
    for (const item of orderSummary.items) {
      const product = inventoryData.products[item.product_id];
      if (!product) {
        return {
          success: false,
          updated_products: [],
          message: `Product ${item.product_id} not found`,
        };
      }

      if (product.stock < item.quantity) {
        return {
          success: false,
          updated_products: [],
          message: `Insufficient stock for ${item.product_name}: ${product.stock} available, ${item.quantity} requested`,
        };
      }
    }

    // All items are available - proceed with reservation
    for (const item of orderSummary.items) {
      const product = inventoryData.products[item.product_id];
      const oldStock = product.stock;
      const newStock = oldStock - item.quantity;

      product.stock = newStock;
      updatedProducts.push({
        product_id: item.product_id,
        old_stock: oldStock,
        new_stock: newStock,
      });

      console.log(
        `Reserved ${item.quantity}x ${item.product_name}: ${oldStock} → ${newStock}`
      );
    }

    const saveSuccess = await this.saveInventory(inventoryData);
    if (!saveSuccess) {
      return {
        success: false,
        updated_products: [],
        message: "Failed to save inventory updates",
      };
    }

    return {
      success: true,
      updated_products: updatedProducts,
      message: `Successfully reserved ${orderSummary.items.length} items`,
    };
  }

  // Restock items (increase stock)
  public async restockItem(
    productId: string,
    quantity: number
  ): Promise<UpdateResult> {
    const inventoryData = await this.loadInventory();
    if (!inventoryData) {
      return {
        success: false,
        updated_products: [],
        message: "Inventory system unavailable",
      };
    }

    const product = inventoryData.products[productId];
    if (!product) {
      return {
        success: false,
        updated_products: [],
        message: `Product ${productId} not found`,
      };
    }

    const oldStock = product.stock;
    const newStock = oldStock + quantity;
    product.stock = newStock;

    const saveSuccess = await this.saveInventory(inventoryData);
    if (!saveSuccess) {
      return {
        success: false,
        updated_products: [],
        message: "Failed to save inventory updates",
      };
    }

    console.log(
      `Restocked ${product.name}: ${oldStock} → ${newStock} (+${quantity})`
    );

    return {
      success: true,
      updated_products: [
        {
          product_id: productId,
          old_stock: oldStock,
          new_stock: newStock,
        },
      ],
      message: `Successfully restocked ${product.name} with ${quantity} units`,
    };
  }

  // Cancel reservation (return stock)
  public async cancelReservation(
    orderSummary: OrderSummary
  ): Promise<UpdateResult> {
    const inventoryData = await this.loadInventory();
    if (!inventoryData) {
      return {
        success: false,
        updated_products: [],
        message: "Inventory system unavailable",
      };
    }

    const updatedProducts: Array<{
      product_id: string;
      old_stock: number;
      new_stock: number;
    }> = [];

    // Return reserved stock
    for (const item of orderSummary.items) {
      const product = inventoryData.products[item.product_id];
      if (product) {
        const oldStock = product.stock;
        const newStock = oldStock + item.quantity;
        product.stock = newStock;

        updatedProducts.push({
          product_id: item.product_id,
          old_stock: oldStock,
          new_stock: newStock,
        });

        console.log(
          `Cancelled reservation for ${item.product_name}: ${oldStock} → ${newStock} (+${item.quantity})`
        );
      }
    }

    const saveSuccess = await this.saveInventory(inventoryData);
    if (!saveSuccess) {
      return {
        success: false,
        updated_products: [],
        message: "Failed to save inventory updates",
      };
    }

    return {
      success: true,
      updated_products: updatedProducts,
      message: `Successfully cancelled reservation for ${orderSummary.items.length} items`,
    };
  }

  // Generate restock alerts
  public async generateRestockAlerts(threshold: number = 5): Promise<
    Array<{
      product_id: string;
      product_name: string;
      current_stock: number;
      threshold: number;
    }>
  > {
    const inventoryData = await this.loadInventory();
    if (!inventoryData) return [];

    const lowStockItems = Object.entries(inventoryData.products)
      .filter(([id, product]: [string, any]) => product.stock <= threshold)
      .map(([id, product]: [string, any]) => ({
        product_id: id,
        product_name: product.name,
        current_stock: product.stock,
        threshold,
      }));

    if (lowStockItems.length > 0) {
      console.log(
        `${lowStockItems.length} items need restocking:`,
        lowStockItems
          .map((item) => `${item.product_name} (${item.current_stock})`)
          .join(", ")
      );
    }

    return lowStockItems;
  }

  // Get current stock levels
  public async getCurrentStock(): Promise<{ [productId: string]: number }> {
    const inventoryData = await this.loadInventory();
    if (!inventoryData) return {};

    const stockLevels: { [productId: string]: number } = {};
    for (const [id, product] of Object.entries(inventoryData.products)) {
      stockLevels[id] = (product as any).stock;
    }

    return stockLevels;
  }

  // Batch update multiple products
  public async batchUpdateStock(
    updates: Array<{
      product_id: string;
      quantity_change: number; // positive for restock, negative for sale
    }>
  ): Promise<UpdateResult> {
    const inventoryData = await this.loadInventory();
    if (!inventoryData) {
      return {
        success: false,
        updated_products: [],
        message: "Inventory system unavailable",
      };
    }

    const updatedProducts: Array<{
      product_id: string;
      old_stock: number;
      new_stock: number;
    }> = [];

    // Apply all updates
    for (const update of updates) {
      const product = inventoryData.products[update.product_id];
      if (product) {
        const oldStock = product.stock;
        const newStock = Math.max(0, oldStock + update.quantity_change); // Prevent negative stock
        product.stock = newStock;

        updatedProducts.push({
          product_id: update.product_id,
          old_stock: oldStock,
          new_stock: newStock,
        });
      }
    }

    const saveSuccess = await this.saveInventory(inventoryData);
    if (!saveSuccess) {
      return {
        success: false,
        updated_products: [],
        message: "Failed to save batch updates",
      };
    }

    return {
      success: true,
      updated_products: updatedProducts,
      message: `Successfully updated ${updatedProducts.length} products`,
    };
  }
}

// Create singleton instance
export const updateAgent = new UpdateAgent();
