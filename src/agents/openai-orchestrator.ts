// src/agents/openai-orchestrator.ts

import { openaiClient } from '../utils/openai-client';
import { availableFunctions } from './openai-functions';
import { functionHandlers } from './function-handlers';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

interface OpenAIOrchestratorResponse {
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
    tokensUsed: number;
  };
}

export class OpenAIOrchestratorAgent {

  // Main processing function - uses OpenAI to coordinate agents
  public async processOrderRequest(prompt: string, customerInfo?: {
    name?: string;
    email?: string;
  }): Promise<OpenAIOrchestratorResponse> {
    
    const startTime = Date.now();
    const agentsUsed: string[] = ['openai-orchestrator'];

    try {
      console.log(`🤖 OpenAI Orchestrator processing: "${prompt}"`);

      // Create the system message that explains the toy store context
      const systemMessage = `You are an AI assistant for "Toy Corner", a toy store in Alphen aan den Rijn, Netherlands. 

You help customers with:
- Checking product availability and pricing
- Processing orders
- Providing store information
- Answering questions about toys

You have access to these functions:
- check_inventory: Check product availability and calculate totals
- generate_email: Create customer communications
- get_store_info: Get store hours, contact info, policies
- update_inventory: Reserve items or update stock

Always be helpful, friendly, and professional. When customers want to order items, check inventory first, then generate appropriate communications.`;

      // Call OpenAI with function calling capability
      const completion = await openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        tools: availableFunctions,
        tool_choice: "auto", // Let OpenAI decide which tools to use
        temperature: 0.7
      });

      const message = completion.choices[0].message;
      const tokensUsed = completion.usage?.total_tokens || 0;

      // Check if OpenAI wants to call functions
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log(`🔧 OpenAI wants to call ${message.tool_calls.length} function(s)`);
        
        // Execute all function calls
        const functionResults = [];
        for (const toolCall of message.tool_calls) {
          if (toolCall.type === 'function') {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);
            
            console.log(`🎯 Calling function: ${functionName}`);
            agentsUsed.push(functionName);
            
            if (functionHandlers[functionName]) {
              const result = await functionHandlers[functionName](functionArgs);
              functionResults.push({
                toolCallId: toolCall.id,
                functionName,
                result
              });
            } else {
              console.error(`❌ Unknown function: ${functionName}`);
              functionResults.push({
                toolCallId: toolCall.id,
                functionName,
                result: { success: false, message: `Unknown function: ${functionName}` }
              });
            }
          }
        }

        // Send function results back to OpenAI for final response
        const messages: ChatCompletionMessageParam[] = [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt },
          message,
        ];

        // Add function results to conversation
        for (const funcResult of functionResults) {
          messages.push({
            role: "tool",
            tool_call_id: funcResult.toolCallId,
            content: JSON.stringify(funcResult.result)
          });
        }

        // Get final response from OpenAI
        const finalCompletion = await openaiClient.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: messages,
          temperature: 0.7
        });

        const finalMessage = finalCompletion.choices[0].message.content || "I apologize, but I couldn't process your request.";
        const totalTokens = tokensUsed + (finalCompletion.usage?.total_tokens || 0);

        // Extract data from function results
        let orderSummary, emailContent, nextActions;
        
        for (const funcResult of functionResults) {
          if (funcResult.functionName === 'check_inventory' && funcResult.result.success) {
            orderSummary = funcResult.result.order_summary;
          }
          if (funcResult.functionName === 'generate_email' && funcResult.result.success) {
            emailContent = funcResult.result.body;
          }
        }

        // Generate next actions based on results
        if (orderSummary) {
          if (orderSummary.status === 'available') {
            nextActions = ['Reply "CONFIRM ORDER" to place this order', 'Ask questions about shipping or returns'];
          } else if (orderSummary.status === 'partial') {
            nextActions = ['Reply "CONFIRM PARTIAL" to order available items only', 'Ask for alternative suggestions'];
          } else {
            nextActions = ['Browse our available products', 'Ask for alternative suggestions'];
          }
        }

        return {
          success: true,
          result: finalMessage,
          order_summary: orderSummary,
          email_content: emailContent,
          next_actions: nextActions,
          metadata: {
            agentsUsed,
            executionTime: Date.now() - startTime,
            timestamp: new Date().toISOString(),
            action_performed: 'ai_orchestration_with_functions',
            tokensUsed: totalTokens
          }
        };

      } else {
        // No function calls needed, just return OpenAI's direct response
        const directResponse = message.content || "I'm here to help with your toy store needs!";

        return {
          success: true,
          result: directResponse,
          next_actions: ['Ask about specific products', 'Browse our toy categories', 'Place an order'],
          metadata: {
            agentsUsed,
            executionTime: Date.now() - startTime,
            timestamp: new Date().toISOString(),
            action_performed: 'direct_ai_response',
            tokensUsed
          }
        };
      }

    } catch (error) {
      console.error('❌ OpenAI Orchestrator error:', error);
      return {
        success: false,
        result: 'I apologize, but I encountered an error processing your request. Please try again.',
        metadata: {
          agentsUsed,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          action_performed: 'error_handling',
          tokensUsed: 0
        }
      };
    }
  }
}

// Create singleton instance
export const openaiOrchestratorAgent = new OpenAIOrchestratorAgent();
