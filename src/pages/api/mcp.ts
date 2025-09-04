import type { NextApiRequest, NextApiResponse } from 'next';
import { ChatAnthropic } from '@langchain/anthropic';

const MCP_BASE_URL = 'https://b05c5855ce70.ngrok-free.app';
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
      'Accept': 'text/event-stream',
      'ngrok-skip-browser-warning': 'true'
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
  console.log(`\n  ==================== MCP TOOL CALL ====================`);
  console.log(`  [MCP] Tool Name: ${toolName}`);
  console.log(`  [MCP] Arguments:`, JSON.stringify(args, null, 2));
  console.log(`  [MCP] Timestamp: ${new Date().toISOString()}`);
  
  const { sessionId, messageUrl } = await initMCPSession();
  console.log(`  [MCP] Session ID: ${sessionId}`);
  
  const requestBody = {
    jsonrpc: "2.0",
    method: "tools/call",
    params: { name: toolName, arguments: args },
    id: Date.now()
  };
  
  console.log(`  [MCP] Full Request Body:`, JSON.stringify(requestBody, null, 2));
  console.log(`  [MCP] Sending to: ${messageUrl}`);
  
  const response = await fetch(messageUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    },
    body: JSON.stringify(requestBody)
  });
  
  console.log(`  [MCP] Response Status: ${response.status} ${response.statusText}`);
  console.log(`  [MCP] Response Headers:`, Object.fromEntries(response.headers.entries()));
  
  const text = await response.text();
  console.log(`  [MCP] Raw Response (first 500 chars):`, text.substring(0, 500));
  
  try {
    const data = JSON.parse(text);
    
    if (data.result) {
      console.log(`  [MCP] ✅ RESULT FOUND:`, JSON.stringify(data.result, null, 2).substring(0, 1000));
      console.log(`  ========================================================\n`);
      return data.result;
    }
    if (data.error) {
      console.log(`  [MCP] ❌ ERROR:`, data.error);
      console.log(`  ========================================================\n`);
      throw new Error(data.error.message || JSON.stringify(data.error));
    }
  } catch (e) {
    console.log(`  [MCP] Failed to parse response:`, e);
    console.log(`  [MCP] Full response text:`, text);
  }
  
  console.log(`  [MCP] ❌ NO RESULT FOUND IN RESPONSE`);
  console.log(`  ========================================================\n`);
  throw new Error('No result from MCP tool');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('❌ Request timeout after 60 seconds');
      res.status(504).json({ error: 'Request timeout - query may be too complex or ambiguous. Please be more specific.' });
    }
  }, 60000); // 60 second timeout to prevent hanging

  try {
    const { input } = req.body;
    
    if (!input) {
      clearTimeout(timeout);
      return res.status(400).json({ error: 'Missing input' });
    }
    
    console.log('\n=== MCP Agent Starting ===');
    console.log('User Query:', input);
    console.log('Time:', new Date().toISOString());
    
    const claude = new ChatAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      modelName: 'claude-3-opus-20240229', // Use Opus for better instruction following
      temperature: 0,
      maxTokens: 2000,
    });
    
    const steps: any[] = [];
    let conversationHistory = '';
    
    const systemPrompt = `You are a leave management assistant helping HR personnel manage employee leaves. You MUST use real tools to get real data.

AVAILABLE TOOLS:
⚠️ CRITICAL: Query the DEV.TEMP.LEAVES_SLALOM view for leave management data!

- snowflake_query: Execute any SQL query on Snowflake database - use {"query": "SELECT ..."}
  ⭐ Use this for custom queries on the leave data
- query_leaves_data: Query the DEV.TEMP.LEAVES_SLALOM view for leave management data - use {"filters": {...}}
  ⭐ BEST tool for accessing leave information!
- analyze_caregiving_leaves: Analyze caregiving leave patterns (intermittent vs continuous) - use {}
  ⭐ Use for understanding caregiving leave trends
- leave_duration_stats: Get statistics on leave durations by type - use {"leave_type": "type"}
  ⭐ Use for duration analysis by leave type
- leave_trends: Analyze leave trends over time - use {"time_period": "period"}
  ⭐ Use for trend analysis over time
- list_databases: List all accessible Snowflake databases - use {}
- list_schemas: List schemas in a Snowflake database - use {"database": "name"}
- list_tables: List tables in a Snowflake schema - use {"database": "name", "schema": "name"}
- describe_table: Get schema information for a Snowflake table - use {"database": "name", "schema": "name", "table": "name"}
- get_snowflake_context: Get current Snowflake connection context - use {}

⚠️ CRITICAL: You MUST follow this EXACT format:

Thought: I need to [specific reasoning]
Action: [exact_tool_name]
Action Input: {"param": "value"}

Then STOP and wait for the system to provide an Observation.

❌ NEVER write "Observation:" yourself
❌ NEVER make up leave data or employee information 
❌ NEVER continue past Action Input
✅ ONLY write Thought, Action, Action Input then STOP

Example of CORRECT format:
Thought: I need to find delegate data, starting with schemas
Action: get_schemas
Action Input: {}

[STOP HERE - system will provide real Observation]

When you get REAL data back, continue:
Thought: The system returned [analyze real data, EXTRACT TOKEN from schema names]
Action: [next_tool]
Action Input: {"param": "value"}

Example: For leave management queries:
- Caregiving leaves can be intermittent (taken in chunks) or continuous
- Medical leaves are tracked separately from parental leaves
- Duration statistics help understand typical leave patterns

Final answer ONLY when you have REAL data:
Thought: I have the actual data from the database
Final Answer: [Present the REAL data you received]

IMPORTANT: Registry Validation Workflow
1. FIRST: Use describe_table to verify table is in registry
2. ONLY proceed if table has valid registry metadata
3. Tables without registry validation should NOT be queried

For leave queries - EXTRACT THE ACTUAL LEAVE DATA:

STEP 1: Query leaves: query_leaves_data {"filters": {"leave_type": "caregiving"}}

STEP 2: Analyze patterns: analyze_caregiving_leaves {}

STEP 3: PARSE THE RESPONSE for actual data:
The query response contains REAL DATA including:
- employee_id: The employee identifier
- leave_type: Type of leave (medical, caregiving, parental)
- leave_status: Whether intermittent or continuous
- start_date: When the leave begins
- end_date: When the leave ends
- duration_days: Total days of leave

STEP 4: Present the data properly:
✅ CORRECT: "Employee 12345 has a caregiving leave from 2024-01-15 to 2024-02-15 (31 days)"
❌ WRONG: "The table has leave data"

The description field contains the ACTUAL proposal text - markdown, JSON, or plain text.
EXTRACT IT and SHOW IT to the user!

IMPORTANT for leave management queries:
1. Always start with query_leaves_data to access the main leave view
   - The DEV.TEMP.LEAVES_SLALOM view contains all leave information
   - Filter by leave_type for specific types (medical, caregiving, parental)
   - Check leave_status for intermittent vs continuous patterns
2. For accurate leave analysis, use this OPTIMIZED approach:
   
   EFFICIENT QUERY PATTERN for leave analysis:
   SELECT 
     leave_type,
     leave_status,
     COUNT(*) as leave_count,
     AVG(duration_days) as avg_duration,
     MAX(duration_days) as max_duration,
     MIN(duration_days) as min_duration
   FROM DEV.TEMP.LEAVES_SLALOM
   WHERE leave_type = 'caregiving'
   GROUP BY leave_type, leave_status
   ORDER BY leave_count DESC;
   
   This query pattern:
   - Uses DISTINCT ON to get the latest balance for each delegate efficiently
   - Converts raw values to tokens using appropriate decimals
   - Filters out zero balances
   - Returns top results in one query
   
3. Leave Pattern Detection - ALWAYS analyze these aspects:
   a) FIRST: Check the distribution of intermittent vs continuous leaves
      - Use analyze_caregiving_leaves for caregiving-specific patterns
      - This shows how employees typically take their leaves
   b) SECOND: Examine duration statistics by leave type
      - Use leave_duration_stats to understand typical leave lengths
      - Compare across different leave types
   c) THIRD: Look at trends over time
      - Use leave_trends to see if patterns are changing
4. For any leave management queries:
   - First use query_leaves_data to access the main leave view
   - Filter by specific criteria (leave_type, dates, status)
   - IMPORTANT: Understand the difference between intermittent and continuous
   - Analyze patterns to provide insights
   - Use specialized tools for deeper analysis
5. KEY LEAVE MANAGEMENT INSIGHTS:
   - CRITICAL: Understand the context of caregiving vs medical vs parental leaves
   - Leave status priorities:
     1. FIRST: Determine if leave is intermittent or continuous
     2. SECOND: Calculate total duration and impact
     3. THIRD: Compare to typical patterns for that leave type
   - IMPORTANT for HR guidance:
     * Caregiving leaves are less common than medical/parental
     * Intermittent leaves require different management than continuous
     * Duration varies significantly by leave type
     * Trends help predict future leave patterns
   - When analyzing patterns, provide actionable insights
   - Format all responses with clear, HR-friendly language`;

    // ReAct loop
    const maxSteps = 15; // Increased for multi-query approach
    
    for (let i = 0; i < maxSteps; i++) {
      const prompt = `${systemPrompt}

User Question: ${input}

Conversation so far:
${conversationHistory}

What is your next thought and action?`;

      console.log(`\n=== Step ${i + 1} ===`);
      console.log('Sending prompt to Claude...');
      
      const response = await claude.invoke(prompt);
      const responseText = response.content.toString();
      
      console.log('\n--- CLAUDE RESPONSE START ---');
      console.log(responseText);
      console.log('--- CLAUDE RESPONSE END ---\n');
      
      if (responseText.includes('Final Answer:')) {
        console.log('\n=== FINAL ANSWER FOUND ===');
        const answer = responseText.split('Final Answer:')[1].trim();
        console.log('Answer preview:', answer.substring(0, 500));
        
        clearTimeout(timeout);
        return res.status(200).json({
          success: true,
          output: answer,
          steps,
          iterations: i + 1
        });
      }
      
      const thoughtMatch = responseText.match(/Thought:\s*([^\n]+)/);
      const actionMatch = responseText.match(/Action:\s*(\w+)/);

      let inputMatch = null;
      const actionInputIndex = responseText.indexOf('Action Input:');
      if (actionInputIndex !== -1) {
        const afterActionInput = responseText.substring(actionInputIndex + 13).trim();
        if (afterActionInput.startsWith('{')) {
          // Find the matching closing brace
          let braceCount = 0;
          let endIndex = -1;
          for (let i = 0; i < afterActionInput.length; i++) {
            if (afterActionInput[i] === '{') braceCount++;
            if (afterActionInput[i] === '}') braceCount--;
            if (braceCount === 0) {
              endIndex = i + 1;
              break;
            }
          }
          if (endIndex > 0) {
            const jsonStr = afterActionInput.substring(0, endIndex);
            inputMatch = ['', jsonStr]; 
          }
        }
      }
      
      if (!inputMatch) {
        inputMatch = responseText.match(/Action Input:\s*({.*?})/) ||
                     responseText.match(/Action Input:\s*({})/);
      }
      
      console.log('Parsing results:');
      console.log('  - Thought found:', !!thoughtMatch, thoughtMatch?.[1]);
      console.log('  - Action found:', !!actionMatch, actionMatch?.[1]);
      console.log('  - Input found:', !!inputMatch);
      
      // Check if Claude is hallucinating observations
      if (responseText.includes('Observation:')) {
        console.log('⚠️ WARNING: Claude is hallucinating observations! Correcting...');
        
        const validPart = responseText.split('Observation:')[0];
        const thoughtMatch2 = validPart.match(/Thought:\s*([^\n]+)/);
        const actionMatch2 = validPart.match(/Action:\s*(\w+)/);
        
        let inputMatch2 = null;
        const actionInputIndex2 = validPart.indexOf('Action Input:');
        if (actionInputIndex2 !== -1) {
          const afterActionInput2 = validPart.substring(actionInputIndex2 + 13).trim();
          if (afterActionInput2.startsWith('{')) {
            let braceCount = 0;
            let endIndex = -1;
            for (let i = 0; i < afterActionInput2.length; i++) {
              if (afterActionInput2[i] === '{') braceCount++;
              if (afterActionInput2[i] === '}') braceCount--;
              if (braceCount === 0) {
                endIndex = i + 1;
                break;
              }
            }
            if (endIndex > 0) {
              inputMatch2 = ['', afterActionInput2.substring(0, endIndex)];
            }
          }
        }
        if (!inputMatch2) {
          inputMatch2 = validPart.match(/Action Input:\s*({.*?})/) ||
                       validPart.match(/Action Input:\s*({})/);
        }
        
        if (actionMatch2 && inputMatch2) {
          const thought = thoughtMatch2?.[1] || 'Tilt AI is thinking...';
          const toolName = actionMatch2[1];
          let toolInput: any;
          
          try {
            let jsonStr = inputMatch2[1].trim();
            
            if (jsonStr.includes('\n')) {
              jsonStr = jsonStr.replace(/\n/g, '\\n');
            }
            
            toolInput = JSON.parse(jsonStr);
            
            if (toolName === 'get_tables' && toolInput.schema && !toolInput.schema_name) {
              toolInput.schema_name = toolInput.schema;
              delete toolInput.schema;
            }
            if (toolName === 'get_columns' && toolInput.table && !toolInput.table_name) {
              toolInput.table_name = toolInput.table;
              delete toolInput.table;
            }
            
            console.log(`\n>>> EXECUTING TOOL (from hallucinated response): ${toolName}`);
            console.log('Input:', JSON.stringify(toolInput, null, 2));
            
            const startTime = Date.now();
            const result = await callMCPTool(toolName, toolInput);
            console.log(`Tool completed in ${Date.now() - startTime}ms`);
            
            let formattedResult = '';
            if (result && result.content && result.content[0]?.text) {
              formattedResult = result.content[0].text;
            } else if (typeof result === 'string') {
              formattedResult = result;
            } else {
              formattedResult = JSON.stringify(result);
            }
            
            steps.push({
              action: { tool: toolName, toolInput, log: thought },
              observation: formattedResult
            });
            
            conversationHistory += `
Thought: ${thought}
Action: ${toolName}
Action Input: ${JSON.stringify(toolInput)}
Observation: ${formattedResult.substring(0, 1000)}

`;
            continue; // Continue to next iteration with real data
            
          } catch (error) {
            console.error('Error executing tool from hallucinated response:', error);
          }
        }
        
        // If we couldn't extract a valid action, tell Claude to try again
        conversationHistory += `System: DO NOT write "Observation:". Only write Thought, Action, and Action Input. I will provide the real Observation. Try again.\n`;
        continue;
      }
      
      if (actionMatch && inputMatch) {
        const thought = thoughtMatch?.[1] || 'Tilt AI is thinking...';
        const toolName = actionMatch[1];
        let toolInput: any;
        
        try {
          // Get the JSON part, handling potential newlines
          let jsonStr = inputMatch[1].trim();
          
          console.log('Raw JSON string before processing:', jsonStr);
          
          // Handle multi-line SQL queries by looking for the pattern where the query value spans lines
          // Check if this looks like a SQL query with newlines
          if (toolName === 'execute_sql_query' && jsonStr.includes('\n')) {
            // Extract everything between the first { and last }
            const queryMatch = jsonStr.match(/\{\s*"query"\s*:\s*"([\s\S]*?)"\s*\}/);
            if (queryMatch) {
              // Get the query content and escape newlines
              const queryContent = queryMatch[1].replace(/\n/g, '\\n');
              jsonStr = `{"query": "${queryContent}"}`;
            } else {
              // Try to handle other formats - replace unescaped newlines in strings
              jsonStr = jsonStr.replace(/"([^"]*)\n+([^"]*)"/g, (match, before, after) => {
                return `"${before}\\n${after}"`;
              });
            }
          }
          
          console.log('Processed JSON string:', jsonStr);
          
          toolInput = JSON.parse(jsonStr);
          
          // Fix common parameter name issues
          if (toolName === 'get_tables' && toolInput.schema && !toolInput.schema_name) {
            toolInput.schema_name = toolInput.schema;
            delete toolInput.schema;
            console.log('Fixed parameter: schema -> schema_name');
          }
          if (toolName === 'get_columns' && toolInput.table && !toolInput.table_name) {
            toolInput.table_name = toolInput.table;
            delete toolInput.table;
            console.log('Fixed parameter: table -> table_name');
          }
          
          // Ensure execute_sql_query has a query parameter
          if (toolName === 'execute_sql_query' && !toolInput.query) {
            console.log('WARNING: execute_sql_query missing query parameter');
            // Skip this malformed action
            conversationHistory += responseText + '\n';
            continue;
          }
        } catch (e) {
          console.log('Could not parse input:', e);
          // For certain tools, empty object is valid
          if (['get_schemas'].includes(toolName)) {
            toolInput = {};
          } else {
            // Skip malformed actions
            conversationHistory += responseText + '\n';
            continue;
          }
        }
        
        console.log(`\n>>> EXECUTING TOOL: ${toolName}`);
        console.log('Input:', JSON.stringify(toolInput, null, 2));
        
        try {
          console.log('Calling MCP API...');
          const startTime = Date.now();
          const result = await callMCPTool(toolName, toolInput);
          console.log(`Tool completed in ${Date.now() - startTime}ms`);
          
          let formattedResult = '';
          if (result && result.content && result.content[0]?.text) {
            formattedResult = result.content[0].text;
            console.log('Tool result (text):', formattedResult.substring(0, 300));
          } else if (typeof result === 'string') {
            formattedResult = result;
            console.log('Tool result (string):', formattedResult.substring(0, 300));
          } else {
            formattedResult = JSON.stringify(result);
            console.log('Tool result (JSON):', formattedResult.substring(0, 300));
          }
          
          steps.push({
            action: {
              tool: toolName,
              toolInput,
              log: thought
            },
            observation: formattedResult
          });
          
          // Add to conversation history
          conversationHistory += `
Thought: ${thought}
Action: ${toolName}
Action Input: ${JSON.stringify(toolInput)}
Observation: ${formattedResult.substring(0, 1000)}

`;
          
        } catch (error) {
          console.error(`Tool ${toolName} error:`, error);
          conversationHistory += `
Thought: ${thought}
Action: ${toolName}
Action Input: ${JSON.stringify(toolInput)}
Observation: Error - ${error instanceof Error ? error.message : 'Unknown error'}

`;
        }
      } else {
        console.log('WARNING: Could not parse action from Claude response');
        console.log('Looking for Action: and Action Input: in response');
        // If we can't parse an action, ask Claude to continue
        conversationHistory += responseText + '\n';
      }
    }
    
    const finalPrompt = `Based on the information gathered, please provide a Final Answer to the user's question: "${input}"

${conversationHistory}

Final Answer:`;

    const finalResponse = await claude.invoke(finalPrompt);
    const finalAnswer = finalResponse.content.toString();
    
    clearTimeout(timeout);
    return res.status(200).json({
      success: true,
      output: finalAnswer,
      steps,
      iterations: steps.length
    });
    
  } catch (error) {
    clearTimeout(timeout);
    console.error('Dynamic agent error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}