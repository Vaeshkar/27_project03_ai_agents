// src/types/order-types.ts

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  age_range: string;
  description: string;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface OrderSummary {
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: "available" | "partial" | "unavailable";
  unavailable_items?: string[];
}

export interface StockCheckResult {
  available: boolean;
  current_stock: number;
  requested_quantity: number;
  product: Product;
}

export interface InventoryResponse {
  success: boolean;
  order_summary?: OrderSummary;
  stock_checks: StockCheckResult[];
  message: string;
}

export interface EmailResponse {
  subject: string;
  body: string;
  type: "confirmation" | "unavailable" | "partial";
}

export interface UpdateResult {
  success: boolean;
  updated_products: Array<{
    product_id: string;
    old_stock: number;
    new_stock: number;
  }>;
  message: string;
}

export interface OrderRequest {
  customer_name?: string;
  customer_email?: string;
  items: Array<{
    product_query: string; // e.g. "2 LEGO Creator sets"
    quantity?: number;
  }>;
  action?: "check" | "reserve" | "complete";
}
