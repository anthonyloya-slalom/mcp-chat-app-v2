import type { NextApiRequest, NextApiResponse } from 'next';
import { ChatAnthropic } from '@langchain/anthropic';
import { searchLeaveData } from '../../lib/mock-leave-data';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const MCP_BASE_URL = 'http://localhost:8000';
const MCP_SSE_URL = `${MCP_BASE_URL}/sse`;

let globalSessionId: string | null = null;
let globalMessageUrl: string | null = null;

async function initMCPSession(): Promise<{ sessionId: string, messageUrl: string }> {
  if (globalSessionId && globalMessageUrl) {
    return { sessionId: globalSessionId!, messageUrl: globalMessageUrl! };
  }
  
  const sseResponse = await fetch(MCP_SSE_URL, {
    method: 'GET',
    headers: {
      'Accept': 'text/event-stream'
    },
  });
  
  const sseText = await sseResponse.text();
  const lines = sseText.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const endpoint = line.slice(6).trim();
      if (endpoint.startsWith('/messages/')) {
        globalMessageUrl = `${MCP_BASE_URL}${endpoint}`;
        const match = endpoint.match(/session_id=([^&]+)/);
        globalSessionId = match ? match[1] : `session-${Date.now()}`;
        break;
      }
    }
  }
  
  if (!globalMessageUrl) {
    globalMessageUrl = `${MCP_BASE_URL}/messages/?session_id=${Date.now()}`;
    globalSessionId = `session-${Date.now()}`;
  }
  
  await fetch(globalMessageUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "dynamic-agent", version: "1.0.0" }
      },
      id: 1
    })
  });
  
  await fetch(globalMessageUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {}
    })
  });
  
  return { sessionId: globalSessionId!, messageUrl: globalMessageUrl! };
}

async function callMCPTool(toolName: string, args: any): Promise<any> {
  const { sessionId, messageUrl } = await initMCPSession();
  
  console.log(`🔧 Calling MCP tool: ${toolName} with args:`, args);
  console.log(`📡 Using message URL: ${messageUrl}`);
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  try {
    const response = await fetch(messageUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: { name: toolName, arguments: args },
        id: Date.now()
      }),
      signal: controller.signal
    });
  
    clearTimeout(timeout);
    const text = await response.text();
    console.log(`📥 MCP Response for ${toolName}:`, text.substring(0, 500));
    
    try {
      const data = JSON.parse(text);
      if (data.result) {
        console.log(`✅ MCP tool ${toolName} returned result`);
        return data.result;
      }
      if (data.error) {
        console.error(`❌ MCP tool ${toolName} error:`, data.error);

        return {
          content: [{
            type: 'text',
            text: `Error from ${toolName}: ${data.error.message || JSON.stringify(data.error)}`
          }]
        };
      }
    } catch (parseError) {
      console.error(`Failed to parse MCP response:`, parseError);
    }
  } catch (fetchError: any) {
    clearTimeout(timeout);
    if (fetchError.name === 'AbortError') {
      console.error(`⏱️ MCP tool ${toolName} timed out after 30 seconds`);
      return {
        content: [{
          type: 'text',
          text: `Tool ${toolName} timed out. The server may be processing a complex query or there may be a connection issue.`
        }]
      };
    }
    console.error(`Failed to call MCP tool:`, fetchError);
  }
  
  console.warn(`⚠️ MCP unavailable, trying mock data for ${toolName}`);
  if (toolName.toLowerCase().includes('leave') || toolName.toLowerCase().includes('employee')) {
    const query = JSON.stringify(args);
    const results = searchLeaveData(query);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2)
      }]
    };
  }
  
  return {
    content: [{
      type: 'text',
      text: `No data available from ${toolName} tool. Using mock leave data instead.`
    }]
  };
}

async function callTool(toolName: string, args: any): Promise<any> {
  // Redirect snowflake_query to leave_data_query since MCP is not available
  if (toolName === 'snowflake_query') {
    console.log('🔄 Redirecting snowflake_query to leave_data_query');
    toolName = 'leave_data_query';
    // Convert SQL query to natural language if possible
    if (args.query && args.query.toLowerCase().includes('select')) {
      if (args.query.toLowerCase().includes('intermittent') || args.query.toLowerCase().includes('continuous')) {
        args.query = 'intermittent vs continuous leave';
      } else if (args.query.toLowerCase().includes('count')) {
        args.query = 'count of leaves by type';
      } else {
        args.query = 'general leave statistics';
      }
    }
  }
  
  // Handle leave data queries with mock data
  if (toolName === 'leave_data_query' || toolName === 'search_leave_data' || toolName === 'query_leave_data') {
    const query = args.query || args.search_term || JSON.stringify(args);
    const results = searchLeaveData(query);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2)
      }]
    };
  }
  
  // Default to MCP tools
  return callMCPTool(toolName, args);
}

// Helper to call Claude via Bedrock
async function callClaudeBedrock(prompt: string): Promise<string> {
  const client = new BedrockRuntimeClient({ region: "us-east-2" }); // Ohio region

  // Use the cross-region inference profile for Claude Opus 4.1
  // This uses the inference profile which is required for Opus model
  const modelId = "us.anthropic.claude-opus-4-1-20250805-v1:0";

  // Claude 3 models use the Messages API format
  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 2000,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body,
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  // Claude 3 response format
  if (responseBody.content && Array.isArray(responseBody.content)) {
    return responseBody.content[0]?.text || "";
  }
  
  // Fallback for other response formats
  return responseBody.completion || responseBody.result || "";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Set a 60 second timeout for the entire request
  const requestTimeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('❌ Request timeout after 60 seconds');
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: 'Request timeout - query too complex or ambiguous' })}\n\n`);
      res.end();
    }
  }, 60000);

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Helper to send SSE messages with immediate flush
  const sendEvent = (type: string, data: any) => {
    console.log(`📤 Sending SSE event: ${type}`, data);
    res.write(`event: ${type}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    // Force flush to ensure the event is sent immediately
    // @ts-ignore - res.flush() exists but not in types
    if (res.flush) res.flush();
  };

  try {
    const { input, conversationHistory: previousMessages = [] } = req.body;
    
    if (!input) {
      sendEvent('error', { message: 'Missing input' });
      return res.end();
    }
    
    console.log('\n🚀 ==================== NEW STREAMING REQUEST ====================');
    console.log('📝 User Query:', input);
    console.log('🕐 Time:', new Date().toISOString());
    console.log('=================================================================\n');
    
    sendEvent('start', { message: 'Starting MCP Agent', input });
    
    // Build context from conversation history
    let contextSummary = '';
    if (previousMessages && previousMessages.length > 0) {
      // Take last 3 messages for context
      const recentMessages = previousMessages.slice(-3);
      contextSummary = `\nRECENT CONVERSATION CONTEXT:\n${recentMessages.map((msg: any) => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content?.substring(0, 200)}...`
      ).join('\n')}\n\n`;
    }
    
    const systemPrompt = `You are Tilt AI, a helpful assistant with access to employee leave data.

You can help answer questions about employee leave patterns, types (intermittent vs continuous), departments, and usage statistics.

IMPORTANT: Use the leave_data_query tool to answer questions about leave data.

AVAILABLE TOOLS:
- leave_data_query: Query employee leave data - use {"query": "your question about leave data"}
- web_search: Search the web - use {"query": "search terms"}

DO NOT use snowflake_query - it is not available. Always use leave_data_query instead.

You MUST follow this format:
Thought: [Your reasoning]
Action: [tool_name]
Action Input: {"param": "value"}

After receiving the Observation from your tool call, analyze the results and provide a Final Answer.

IMPORTANT: 
- Keep the Action Input JSON on a single line
- Only provide a Final Answer after you have received and analyzed the tool results
- Base your Final Answer on the actual data returned from the tools`;
    
    let conversationHistory = '';
    const maxSteps = 15;
    const failedTools = new Map<string, number>();
    let hasSuccessfulToolCall = false;
    let actualSteps = 0;

    for (let i = 0; i < maxSteps; i++) {
      actualSteps = i + 1;
      sendEvent('step', {
        stepNumber: i + 1,
        status: 'thinking',
        message: 'Tilt AI is thinking...'
      });

      // 👇👇👇 FIX: define prompt here before using it!
      const prompt = `${systemPrompt}

User Question: ${input}

Conversation so far:
${conversationHistory}

What is your next thought and action? Remember to keep Action Input JSON on a single line.`;

      // 👇 Use Bedrock Claude here
      const responseText = await callClaudeBedrock(prompt);

      // Check for final answer
      const finalAnswerMatch = responseText.match(/^Final Answer:\s*(.+)$/m);
      console.log(`🔍 Final Answer match:`, !!finalAnswerMatch);
      if (finalAnswerMatch) {
        const potentialAnswer = finalAnswerMatch[1];
        if (!potentialAnswer.includes('\nThought:') && 
            !potentialAnswer.includes('\nAction:') && 
            !potentialAnswer.includes('\nAction Input:')) {
          sendEvent('final', { 
            answer: potentialAnswer.trim(),
            totalSteps: i + 1
          });
          clearTimeout(requestTimeout);
          return res.end();
        }
      }
      
      // Parse action
      const thoughtMatch = responseText.match(/Thought:\s*([^\n]+)/);
      const actionMatch = responseText.match(/Action:\s*(\w+)/);
      
      // Extract JSON more carefully - look for anything that looks like JSON after Action Input:
      const actionInputMatch = responseText.match(/Action Input:\s*(\{[^\n]+\})/);
      
      console.log('🔍 Parsing results:');
      console.log('  Thought:', thoughtMatch?.[1]);
      console.log('  Action:', actionMatch?.[1]);
      console.log('  Action Input found:', !!actionInputMatch);
      if (actionInputMatch) {
        console.log('  Raw Action Input:', actionInputMatch[1]);
      }
      
      if (!thoughtMatch && !actionMatch && !finalAnswerMatch) {
        console.log('⚠️ Claude response did not match expected format');
        console.log('Response was:', responseText);
        // Skip to next iteration
        continue;
      }
      
      if (actionMatch && actionInputMatch) {
        const thought = thoughtMatch?.[1] || 'Tilt AI is thinking...';
        const toolName = actionMatch[1];
        
        let toolInput: any;
        try {
          // Parse the JSON - it should already be on one line
          const jsonStr = actionInputMatch[1].trim();
          console.log('Parsing JSON:', jsonStr);
          toolInput = JSON.parse(jsonStr);
        } catch (parseError) {
          console.error('Failed to parse Action Input:', actionInputMatch[1]);
          console.error('Parse error:', parseError);
          
          // Try extracting just the query if it's a snowflake_query
          if (toolName === 'snowflake_query') {
            const queryMatch = actionInputMatch[1].match(/"query"\s*:\s*"([^"]+)"/);
            if (queryMatch) {
              toolInput = { query: queryMatch[1] };
              console.log('Extracted query directly:', queryMatch[1]);
            } else {
              sendEvent('error', {
                stepNumber: i + 1,
                message: `Failed to parse tool input`
              });
              continue;
            }
          } else {
            sendEvent('error', {
              stepNumber: i + 1,
              message: `Failed to parse tool input`
            });
            continue;
          }
        }
        
        sendEvent('thinking', {
          stepNumber: i + 1,
          thought,
          message: `Step ${i + 1}: ${thought}`
        });
        
        sendEvent('action', {
          stepNumber: i + 1,
          thought,
          tool: toolName,
          input: toolInput
        });
        
        try {
          const result = await callTool(toolName, toolInput);
          let formattedResult = '';
          
          if (result && result.content && result.content[0]?.text) {
            formattedResult = result.content[0].text;
          } else if (typeof result === 'string') {
            formattedResult = result;
          } else {
            formattedResult = JSON.stringify(result);
          }
          
          sendEvent('observation', {
            stepNumber: i + 1,
            tool: toolName,
            result: formattedResult
          });
          
          hasSuccessfulToolCall = true; // Mark that we've had a successful tool call
          
          conversationHistory += `
Thought: ${thought}
Action: ${toolName}
Action Input: ${JSON.stringify(toolInput)}
Observation: ${formattedResult.substring(0, 1000)}

`;
        } catch (error) {
          // Track failed tools
          failedTools.set(toolName, (failedTools.get(toolName) || 0) + 1);
          console.log(`❌ Tool ${toolName} failed, failure count: ${failedTools.get(toolName)}`);
          
          sendEvent('error', {
            stepNumber: i + 1,
            tool: toolName,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          // If snowflake_query fails, add hint to use leave_data_query
          if (toolName === 'snowflake_query' && failedTools.get(toolName)! >= 2) {
            conversationHistory += `\nThought: ${thought}\nAction: ${toolName}\nAction Input: ${JSON.stringify(toolInput)}\nObservation: Error - tool failed. I should try using the leave_data_query tool instead.\n\n`;
          } else {
            conversationHistory += `\nThought: ${thought}\nAction: ${toolName}\nAction Input: ${JSON.stringify(toolInput)}\nObservation: Error - ${error instanceof Error ? error.message : 'Unknown error'}\n\n`;
          }
        }
      }
    }
    
    // Only generate final answer if we had successful tool calls
    if (hasSuccessfulToolCall) {
      sendEvent('finalizing', { message: 'Preparing final answer...' });
      
      const finalPrompt = `Based on the information gathered from the tools, provide a concise Final Answer to: "${input}"

${conversationHistory}

Provide a clear, data-driven answer based on the tool results above.

Final Answer:`;

      const finalAnswer = await callClaudeBedrock(finalPrompt);
      
      sendEvent('final', {
        answer: finalAnswer,
        totalSteps: actualSteps
      });
    } else {
      // If no successful tool calls, send an error message
      sendEvent('final', {
        answer: 'I was unable to retrieve the data needed to answer your question. Please try rephrasing your query or check if the data source is available.',
        totalSteps: actualSteps
      });
    }
    
    clearTimeout(requestTimeout);
    res.end();
    
  } catch (error) {
    console.error('\n❌ ==================== ERROR ====================');
    console.error('Error:', error);
    console.error('==================================================\n');
    
    sendEvent('error', {
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : String(error)
    });
    res.end();
  }
}