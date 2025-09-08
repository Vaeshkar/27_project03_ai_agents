// src/agents/function-handlers.ts

import { inventoryAgent } from './inventory-agent';
import { communicationAgent } from './communication-agent';
import { updateAgent } from './update-agent';

// Handle check_inventory function calls
export async function handleCheckInventory(args: any) {
  console.log('🔍 OpenAI called check_inventory with:', args);
  
  try {
    const { items } = args;
    const result = await inventoryAgent.checkInventory(items);
    
    return {
      success: result.success,
      order_summary: result.order_summary,
      message: result.message,
      stock_checks: result.stock_checks
    };
  } catch (error) {
    console.error('Error in check_inventory:', error);
    return {
      success: false,
      message: 'Failed to check inventory',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Handle generate_email function calls
export async function handleGenerateEmail(args: any) {
  console.log('📧 OpenAI called generate_email with:', args);
  
  try {
    const { order_summary, customer_name, email_type } = args;
    const result = communicationAgent.generateConfirmationEmail(
      order_summary,
      customer_name
    );
    
    return {
      success: true,
      email: result,
      subject: result.subject,
      body: result.body,
      type: result.type
    };
  } catch (error) {
    console.error('Error in generate_email:', error);
    return {
      success: false,
      message: 'Failed to generate email',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Handle get_store_info function calls
export async function handleGetStoreInfo(args: any) {
  console.log('🏪 OpenAI called get_store_info with:', args);
  
  try {
    const { info_type } = args;
    const storeInfo = inventoryAgent.getStoreInfo();
    
    if (!storeInfo) {
      return {
        success: false,
        message: 'Store information not available'
      };
    }
    
    let response = '';
    
    switch (info_type) {
      case 'hours':
        // Type-safe access to opening_hours
        response = `Store hours: ${(storeInfo as any).opening_hours || 'Monday to Friday: 9:00 - 18:00'}`;
        break;
      case 'contact':
        response = `Contact: ${storeInfo.phone}, Email: ${storeInfo.email}, Location: ${storeInfo.location}`;
        break;
      case 'shipping':
        response = `Shipping: €${storeInfo.shipping_cost}, Free shipping on orders over €${storeInfo.free_shipping_threshold}`;
        break;
      case 'returns':
        response = 'Returns: 14-day return policy, items must be in original packaging';
        break;
      default:
        response = `${storeInfo.name} - ${storeInfo.location}. Phone: ${storeInfo.phone}. ${(storeInfo as any).opening_hours || 'Open Monday-Friday 9-18'}`;
    }
    
    return {
      success: true,
      info: response,
      store_details: storeInfo
    };
  } catch (error) {
    console.error('Error in get_store_info:', error);
    return {
      success: false,
      message: 'Failed to get store information',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Handle update_inventory function calls
export async function handleUpdateInventory(args: any) {
  console.log('📦 OpenAI called update_inventory with:', args);
  
  try {
    const { action, order_summary } = args;
    
    switch (action) {
      case 'reserve':
        if (!order_summary) {
          return { success: false, message: 'Order summary required for reservation' };
        }
        const reserveResult = await updateAgent.reserveItems(order_summary);
        return reserveResult;
        
      case 'cancel':
        if (!order_summary) {
          return { success: false, message: 'Order summary required for cancellation' };
        }
        const cancelResult = await updateAgent.cancelReservation(order_summary);
        return cancelResult;
        
      default:
        return { success: false, message: `Unknown action: ${action}` };
    }
  } catch (error) {
    console.error('Error in update_inventory:', error);
    return {
      success: false,
      message: 'Failed to update inventory',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Function router - maps function names to handlers
export const functionHandlers: { [key: string]: (args: any) => Promise<any> } = {
  check_inventory: handleCheckInventory,
  generate_email: handleGenerateEmail,
  get_store_info: handleGetStoreInfo,
  update_inventory: handleUpdateInventory
};
