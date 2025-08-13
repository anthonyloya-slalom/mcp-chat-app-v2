import type { NextApiRequest, NextApiResponse } from 'next';
import { ChatAnthropic } from '@langchain/anthropic';

const MCP_API_URL = 'https://mcp.parsed.xyz/mcp-sql/sse';

// MCP session management
let globalSessionId: string | null = null;

async function initMCPSession(): Promise<string> {
  if (globalSessionId) return globalSessionId;
  
  const initResponse = await fetch(MCP_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
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
  
  globalSessionId = initResponse.headers.get('mcp-session-id') || `session-${Date.now()}`;
  
  await fetch(MCP_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'mcp-session-id': globalSessionId
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {}
    })
  });
  
  return globalSessionId;
}

async function callMCPTool(toolName: string, args: any): Promise<any> {
  console.log(`\n  ==================== MCP TOOL CALL ====================`);
  console.log(`  [MCP] Tool Name: ${toolName}`);
  console.log(`  [MCP] Arguments:`, JSON.stringify(args, null, 2));
  console.log(`  [MCP] Timestamp: ${new Date().toISOString()}`);
  
  const sessionId = await initMCPSession();
  console.log(`  [MCP] Session ID: ${sessionId}`);
  
  const requestBody = {
    jsonrpc: "2.0",
    method: "tools/call",
    params: { name: toolName, arguments: args },
    id: Date.now()
  };
  
  console.log(`  [MCP] Full Request Body:`, JSON.stringify(requestBody, null, 2));
  console.log(`  [MCP] Sending to: ${MCP_API_URL}`);
  
  const response = await fetch(MCP_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'mcp-session-id': sessionId
    },
    body: JSON.stringify(requestBody)
  });
  
  console.log(`  [MCP] Response Status: ${response.status} ${response.statusText}`);
  console.log(`  [MCP] Response Headers:`, Object.fromEntries(response.headers.entries()));
  
  const text = await response.text();
  console.log(`  [MCP] Raw Response (first 500 chars):`, text.substring(0, 500));
  
  const lines = text.split('\n');
  console.log(`  [MCP] Response has ${lines.length} lines`);
  
  let resultFound = false;
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const jsonStr = line.slice(6);
        console.log(`  [MCP] Parsing line:`, jsonStr.substring(0, 200));
        const data = JSON.parse(jsonStr);
        
        if (data.result) {
          console.log(`  [MCP] ✅ RESULT FOUND:`, JSON.stringify(data.result, null, 2).substring(0, 1000));
          resultFound = true;
          return data.result;
        }
        if (data.error) {
          console.log(`  [MCP] ❌ ERROR:`, data.error);
          throw new Error(data.error.message);
        }
      } catch (e) {
        console.log(`  [MCP] Failed to parse line:`, e);
        continue;
      }
    }
  }
  
  if (!resultFound) {
    console.log(`  [MCP] ❌ NO RESULT FOUND IN RESPONSE`);
    console.log(`  [MCP] Full response text:`, text);
  }
  
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
    
    // System prompt for dynamic discovery - NO HARDCODING
    const systemPrompt = `You are a database assistant. You MUST use real tools to get real data.

AVAILABLE TOOLS:
⚠️ CRITICAL: Only query tables that are in the registry for security!

- describe_table: VERIFY table is in registry - use {"table_name": "name", "schema_name": "name"}
  ⭐ ALWAYS use this FIRST before any table queries!
- get_schemas: Returns all database schemas - use {} or {"include_system": false}
- get_tables: Get tables - use {"schema_name": "name"}
- get_columns: Get columns - use {"schema_name": "name", "table_name": "name"}  
- smart_query: Query REGISTERED tables only - use {"search_term": "search term", "limit": 10}
- execute_sql_query: Run SQL on REGISTERED tables - use {"query": "SELECT ...", "database": "data", "limit": 100}
  ⚠️ Only after describe_table verification!
- query_contract_decimals: Get token decimals - use {"contract_address": "0x...", "blockchain": "ethereum"}
- get_table_details: Get info for REGISTERED tables - use {"table_name": "name", "schema_name": "name"}
- find_project: Find project schemas/tables - use {"project_name": "cryptex", "limit": 20}
- find_column: Find tables with column - use {"column_name": "proposalId", "limit": 50}

⚠️ CRITICAL: You MUST follow this EXACT format:

Thought: I need to [specific reasoning]
Action: [exact_tool_name]
Action Input: {"param": "value"}

Then STOP and wait for the system to provide an Observation.

❌ NEVER write "Observation:" yourself
❌ NEVER make up data like "0x1234..." 
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

Example: If get_schemas returns ["cryptex_mainnet", "compound_v2", "uniswap_v3"]:
- For cryptex_mainnet → use CTX token
- For compound_v2 → use COMP token
- For uniswap_v3 → use UNI token

Final answer ONLY when you have REAL data:
Thought: I have the actual data from the database
Final Answer: [Present the REAL data you received]

IMPORTANT: Registry Validation Workflow
1. FIRST: Use describe_table to verify table is in registry
2. ONLY proceed if table has valid registry metadata
3. Tables without registry validation should NOT be queried

For proposal queries - EXTRACT THE ACTUAL PROPOSAL DESCRIPTIONS:

STEP 1: Verify table: describe_table {"table_name": "ProposalCreated_bd5e0", "schema_name": "governance_beta"}

STEP 2: Get data: get_table_details {"table_name": "ProposalCreated_bd5e0", "schema_name": "governance_beta"}

STEP 3: PARSE THE RESPONSE for actual data:
The get_table_details response contains REAL DATA including:
- proposalId: The proposal ID number (e.g., 149, 150, 151)
- description: THE ACTUAL PROPOSAL TEXT - this is the full proposal content!
- proposer: The address that created the proposal
- block_timestamp: When it was created

STEP 4: Present the data properly:
✅ CORRECT: "Proposal 149: ## Treasury Diversification Proposal\nThis proposal aims to..."
❌ WRONG: "The table has a description column"

The description field contains the ACTUAL proposal text - markdown, JSON, or plain text.
EXTRACT IT and SHOW IT to the user!

IMPORTANT for token balance/voting queries:
1. First discover schemas using get_schemas or find_project
   - Look for project-specific schemas (e.g., "ctx" schema = Cryptex project)
   - If you see BOTH "ctx" schema AND "governance_beta" schema → This is CRYPTEX data, use CTX token
   - governance_beta alone doesn't indicate token - check for project schemas
2. For accurate delegate ranking, use this OPTIMIZED approach:
   
   EFFICIENT QUERY PATTERN for top delegates:
   WITH latest_balances AS (
     SELECT DISTINCT ON (delegate_column) 
            delegate_column,
            balance_column as raw_balance,
            balance_column / decimal_factor as voting_power,
            timestamp_column
     FROM discovered_schema.discovered_table
     ORDER BY delegate_column, timestamp_column DESC
   )
   SELECT delegate_column, voting_power, timestamp_column
   FROM latest_balances
   WHERE voting_power > 0
   ORDER BY voting_power DESC
   LIMIT 3;
   
   This query pattern:
   - Uses DISTINCT ON to get the latest balance for each delegate efficiently
   - Converts raw values to tokens using appropriate decimals
   - Filters out zero balances
   - Returns top results in one query
   
3. Token Decimal Detection - ALWAYS try these steps in order:
   a) FIRST: Look for 'address' or 'contract_address' columns in discovered tables
      - If found, use query_contract_decimals with that address
      - This gives EXACT decimals for the token
   b) FALLBACK: Infer from discovered schema/table names if no contract address
      - Common patterns: governance tokens often use 18, stablecoins 6, BTC variants 8
   c) LAST RESORT: Default to 18 decimals if uncertain
4. For any governance/token queries:
   - First use find_project or get_schemas to discover the data
   - Look for tables with names suggesting voting/delegate/governance
   - IMPORTANT: Check for contract address columns to get exact decimals
   - Get LATEST balance for each address (not MAX!)
   - Convert using discovered or inferred decimals
5. TOKEN SYMBOL DETECTION (DYNAMIC):
   - CRITICAL: Use describe_table tool to get full registry metadata including project name
   - Token identification priority:
     1. FIRST: Use describe_table to get project metadata (e.g., project: "cryptex" → CTX token)
     2. SECOND: Check if other project-specific schemas exist (e.g., "ctx" schema → CTX token)
     3. THIRD: Infer from schema patterns (but be careful with generic names like "governance_beta")
   - IMPORTANT for governance queries:
     * "governance_beta" schema is used by MULTIPLE projects
     * MUST use describe_table or check for project-specific schemas to identify the actual project
     * If you see "ctx" schema or Cryptex mentioned → use CTX token
     * Don't assume "beta" in schema name means BETA token
   - When multiple schemas exist, cross-reference to identify the project
   - Format all final numbers with the correctly identified token symbol`;

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
      
      // Check for final answer
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
      
      // Parse action - handle multi-line format and empty objects
      const thoughtMatch = responseText.match(/Thought:\s*([^\n]+)/);
      const actionMatch = responseText.match(/Action:\s*(\w+)/);
      // Handle Action Input - match JSON objects including multi-line SQL
      // This regex looks for balanced braces to handle nested JSON properly
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
            inputMatch = ['', jsonStr]; // Match format [full match, capture group]
          }
        }
      }
      
      // Fallback to simple patterns if above doesn't work
      if (!inputMatch) {
        inputMatch = responseText.match(/Action Input:\s*({.*?})/s) ||
                     responseText.match(/Action Input:\s*({})/);
      }
      
      console.log('Parsing results:');
      console.log('  - Thought found:', !!thoughtMatch, thoughtMatch?.[1]);
      console.log('  - Action found:', !!actionMatch, actionMatch?.[1]);
      console.log('  - Input found:', !!inputMatch);
      
      // Check if Claude is hallucinating observations
      if (responseText.includes('Observation:')) {
        console.log('⚠️ WARNING: Claude is hallucinating observations! Correcting...');
        
        // Extract only the valid part before the fake observation
        const validPart = responseText.split('Observation:')[0];
        const thoughtMatch2 = validPart.match(/Thought:\s*([^\n]+)/);
        const actionMatch2 = validPart.match(/Action:\s*(\w+)/);
        
        // Use same balanced brace matching for hallucination case
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
          inputMatch2 = validPart.match(/Action Input:\s*({.*?})/s) ||
                       validPart.match(/Action Input:\s*({})/);
        }
        
        if (actionMatch2 && inputMatch2) {
          // Process the valid action before the hallucination
          const thought = thoughtMatch2?.[1] || 'Processing...';
          const toolName = actionMatch2[1];
          let toolInput: any;
          
          try {
            let jsonStr = inputMatch2[1].trim();
            
            // Handle multi-line SQL queries by escaping newlines
            if (jsonStr.includes('\n')) {
              jsonStr = jsonStr.replace(/\n/g, '\\n');
            }
            
            toolInput = JSON.parse(jsonStr);
            
            // Fix parameter names
            if (toolName === 'get_tables' && toolInput.schema && !toolInput.schema_name) {
              toolInput.schema_name = toolInput.schema;
              delete toolInput.schema;
            }
            if (toolName === 'get_columns' && toolInput.table && !toolInput.table_name) {
              toolInput.table_name = toolInput.table;
              delete toolInput.table;
            }
            
            // Execute the real tool
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
            
            // Add REAL observation to history
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
        const thought = thoughtMatch?.[1] || 'Processing...';
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
          
          // Format result for display
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
          
          // Add to steps for UI
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
    
    // If we hit max steps, ask for final answer
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