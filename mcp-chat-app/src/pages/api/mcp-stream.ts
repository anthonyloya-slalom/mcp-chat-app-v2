import type { NextApiRequest, NextApiResponse } from 'next';
import { ChatAnthropic } from '@langchain/anthropic';
import { searchWeb, fetchWebPage } from '../../lib/langchain-tools';

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
  const sessionId = await initMCPSession();
  
  const response = await fetch(MCP_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'mcp-session-id': sessionId
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: toolName, arguments: args },
      id: Date.now()
    })
  });
  
  const text = await response.text();
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6));
        if (data.result) return data.result;
        if (data.error) throw new Error(data.error.message);
      } catch (e) {
        continue;
      }
    }
  }
  
  throw new Error('No result from MCP tool');
}

// Wrapper to handle both MCP and web tools
async function callTool(toolName: string, args: any): Promise<any> {
  // Handle web tools
  if (toolName === 'web_search') {
    const query = args.query || args.search_query;
    if (!query) throw new Error('web_search requires a query parameter');
    
    const results = await searchWeb(query);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2)
      }]
    };
  }
  
  if (toolName === 'fetch_webpage') {
    const url = args.url;
    if (!url) throw new Error('fetch_webpage requires a url parameter');
    
    const content = await fetchWebPage(url);
    return {
      content: [{
        type: 'text',
        text: content
      }]
    };
  }
  
  // Default to MCP tools
  return callMCPTool(toolName, args);
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
    
    const claude = new ChatAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      modelName: 'claude-3-opus-20240229',
      temperature: 0,
      maxTokens: 2000,
    });
    
    // Build context from conversation history
    let contextSummary = '';
    if (previousMessages && previousMessages.length > 0) {
      // Take last 3 messages for context
      const recentMessages = previousMessages.slice(-3);
      contextSummary = `\nRECENT CONVERSATION CONTEXT:\n${recentMessages.map((msg: any) => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content?.substring(0, 200)}...`
      ).join('\n')}\n\n`;
    }
    
    const systemPrompt = `You are a database assistant with knowledge about blockchain governance.
${contextSummary}
🔍 QUERY DECISION FRAMEWORK:
1. GENERAL KNOWLEDGE QUESTIONS - Answer directly without querying:
   - "What does CIP/TIP/PIP mean?" → Explain it's likely "Cryptex Improvement Proposal" or similar
   - "What is a DAO?" → Explain general DAO concepts
   - "How does voting work?" → Explain governance mechanics
   - Any conceptual or definitional questions

2. CONTEXT-BASED QUESTIONS - Use existing data without re-querying:
   - "Explain more about proposal 34" (when you already showed it)
   - "What about that first one?" (referring to previous results)
   - Follow-up questions on data you already presented

3. DATA RETRIEVAL QUESTIONS - Query MCP database tools:
   - "What are the latest proposals?"
   - "Show me delegates with voting power"
   - "Find proposals by address X"
   - Any request for specific blockchain data

4. WEB SEARCH QUESTIONS - Use web_search tool:
   - "What's the current price of CTX?"
   - "Latest news about Cryptex"
   - "Documentation for X protocol"
   - Current events or real-time information
   - Information not found in the database

IMPORTANT: Before using ANY tool, ask yourself:
- Is this a general knowledge question I can answer directly?
- Have I already retrieved this data in the conversation?
- Is the user asking for NEW blockchain data?

Only use tools if the answer is "yes" to the last question.

🚨 ABSOLUTE RULE: ONLY USE DATA FROM OBSERVATIONS 🚨
You are FORBIDDEN from inventing ANY data.

CRITICAL: NEVER write "Final Answer:" unless you are COMPLETELY DONE gathering data!
If you need more data, continue with Thought/Action/Action Input.
Only write "Final Answer:" when you have ALL the data you need to answer the question fully.

When writing your Final Answer:

1. COPY-PASTE the exact values from the Sample Data in observations
2. If Sample Data shows:
   - proposalId: 22 → Use 22 (NOT 23, 24, or any other number)
   - description: CIP-30: Q3 2024 Funds → Use "CIP-30: Q3 2024 Funds" (NOT CIP-29 or CIP-31)
   - proposer: 0x097c39e5... → Use that exact address (NOT a different one)
   
3. NEVER invent:
   - Different proposal numbers (if you see 22, 28, 34 - use ONLY those)
   - Different CIP numbers (if you see CIP-30, CIP-33, CIP-38 - use ONLY those)
   - Additional description text not in the data
   - Proposer addresses not shown in the Sample Data
   
4. If the observation shows 3 rows with specific data, present EXACTLY those 3 rows
5. DO NOT say "I found proposals" then show different ones than what's in the data

RESPONSE FORMATTING GUIDELINES:
- Use clear markdown formatting with headers (##, ###)
- Use tables for comparative data
- Use bullet points for lists
- Shorten long addresses/hashes (e.g., 0x123...abc)
- Include emojis sparingly for visual clarity (📋, ✅, 📅, 🔗)
- Add horizontal rules (---) between major sections
- Bold important values and names
- ALWAYS extract and show descriptive fields like names, titles, descriptions

AVAILABLE TOOLS:

DATABASE TOOLS:
- smart_query: Finds tables in the REGISTRY and queries them - use {"search_term": "search term", "limit": 10}
  ⭐ START HERE - this searches the registry for relevant tables!
- describe_table: Verify table is in registry & get metadata - use {"table_name": "name", "schema_name": "name"}
  ✅ Use this to confirm tables found by smart_query
- get_table_details: Get comprehensive table info with ACTUAL DATA - use {"table_name": "name", "schema_name": "name"}
  ⭐ BEST for getting real proposal descriptions, delegate info, etc.
- get_schemas: Returns all database schemas - use {} or {"include_system": false}
- get_tables: Get tables in schema - use {"schema_name": "name"}
- get_columns: Get columns - use {"schema_name": "name", "table_name": "name"}
- execute_sql_query: Run READ-ONLY SQL queries - use {"query": "SELECT ...", "database": "data", "limit": 100}
  ⚠️ ONLY SELECT queries allowed - NO CREATE/UPDATE/DELETE/DROP/ALTER!
- query_contract_decimals: Get token decimals - use {"contract_address": "0x...", "blockchain": "ethereum"}
- find_project: Find project schemas/tables - use {"project_name": "project_name", "limit": 20}
- find_column: Find tables with column - use {"column_name": "column_name", "limit": 50}

WEB TOOLS:
- web_search: Search the internet for current information - use {"query": "search terms"}
  🌐 Use for current events, documentation, or info not in the database
- fetch_webpage: Fetch and read a specific webpage - use {"url": "https://example.com"}
  📄 Use to get detailed information from a specific URL

You MUST follow this EXACT format:
Thought: [Your reasoning]
Action: [tool_name]
Action Input: {"param": "value"}

STOP and wait for Observation.

DYNAMIC DATA EXTRACTION WORKFLOW:

1. For proposal queries, search for "ProposalCreated" or "ProposalExecuted" tables
   - These contain the actual proposal descriptions and details
2. Use get_table_details - it returns ALL COLUMNS with ACTUAL DATA
   ⭐ PREFER THIS OVER execute_sql_query!
   ⭐ This gives you the REAL proposal descriptions!
3. ANALYZE ALL the columns and data you receive
   - The "description" field has the actual proposal text (CIP-XX: Title)
   - The "proposalId" field has the proposal number
4. REASON over the complete dataset to answer the question
5. Present the EXACT data from the Sample Data rows

⚠️ CRITICAL: The "Sample Data" rows are the ACTUAL proposals!
If Row 1 has proposalId: 22, that's Proposal #22 (not #23 or any other number)
If Row 2 has proposalId: 28, that's Proposal #28 (not #29)
If Row 3 has proposalId: 34, that's Proposal #34 (not #35)

KEY PRINCIPLE: Query EVERYTHING, then reason:
- get_table_details returns ALL columns for each row
- Don't pre-filter - get all the data first
- Look at EVERY field: IDs, descriptions, amounts, addresses, timestamps, arrays, etc.
- Let the data tell you what's important
- Build your answer from ALL available information

WHAT get_table_details GIVES YOU:
✓ ALL columns in the table
✓ ACTUAL data rows with every field populated
✓ Arrays, structs, nested data - everything
✓ The complete picture to reason over

⚠️ CRITICAL: The "Sample Data" section contains REAL DATA!
When get_table_details shows:
"Row 1:
  proposalId: 22
  description: CIP-30: Q3 2024 Funds for SubDAO operations"

THIS IS REAL DATA! You MUST:
1. EXTRACT the proposalId (22)
2. EXTRACT the description (CIP-30: Q3 2024 Funds for SubDAO operations)
3. EXTRACT all other fields
4. USE THIS EXACT DATA in your Final Answer

DO NOT say "the table contains" - SHOW THE ACTUAL DATA!

DON'T ASSUME what's important - DISCOVER it from the data!

⛔ DATA INTEGRITY CHECK - NEVER:
- Write "CIP-22" if the data shows "CIP-30" 
- Write "Proposal #23" if the data shows "Proposal #22"
- Add text like "Diversify Treasury" if it's not in the description field
- Use proposer addresses not shown in the Sample Data
- Change ANY values from what's in the observations

✅ VERIFICATION: Before writing your Final Answer, ask yourself:
- Did I look at the ACTUAL Sample Data rows?
- Am I using the EXACT proposalId numbers from those rows?
- Am I using the EXACT description text from those rows?
- Did I avoid inventing any new data?

If you can't answer YES to all, go back and copy the exact data!

REASONING OVER COMPLETE DATA:

When get_table_details returns a row with 20 columns, USE ALL 20!

For proposal queries about "executed" proposals:
1. FIRST: Search for and get data from "ProposalCreated" table (has descriptions)
2. THEN: Search for and get data from "ProposalExecuted" table (has execution status)
3. Use get_table_details on BOTH tables to get complete data
4. DO NOT write Final Answer until you have data from BOTH tables!
5. Match proposals by proposalId between the two tables
6. Present ONLY proposals that appear in BOTH tables (truly executed)
7. Use the EXACT descriptions from ProposalCreated table

⚠️ CRITICAL: You MUST query BOTH tables before answering about "executed" proposals!
If you've only queried ProposalCreated, you MUST continue to query ProposalExecuted!
DO NOT stop at step 5 - continue until you have BOTH tables' data!
- block_timestamp: 2025-07-01
- transaction_hash: 0xdef...

ANALYZE IT ALL:
- What contracts are being called? (targets)
- What functions? (signatures)
- What amounts? (values)
- Who proposed it? (proposer)
- When? (block_timestamp)
- What does it do? (description + analyze the calldata)

BUILD A COMPLETE PICTURE from ALL the data, not just description!

The more columns you analyze, the better your answer!

PERSISTENCE IS KEY:
- Keep searching until you find the data
- If asked about "executed" proposals, look for both ProposalCreated AND ProposalExecuted tables
- Use get_table_details to get the actual data
- If one approach fails, try another
- Continue until you have real data to present

WHEN WRITING YOUR FINAL ANSWER:
1. Look at the Sample Data from get_table_details
2. Extract EVERY field you see (proposalId, description, timestamp, etc.)
3. Use the EXACT values - don't change numbers or add text
4. Present ALL the data you found
5. If you found proposals, SHOW THEM (even if unsure about execution status)

IMPORTANT MINDSET:
- The registry contains the tables we need
- smart_query searches the registry effectively
- For proposals: Search "ProposalCreated" to find the main table with descriptions
- Once found, use get_table_details to get the ACTUAL data
- The Sample Data contains REAL proposals with REAL descriptions
- Don't say "insufficient data" if you find proposals - SHOW THEM!
- Even if you can't determine "executed" status, show the proposals you found!

DYNAMIC FORMATTING PRINCIPLES:

Based on the DATA YOU FIND, format appropriately:

If you find DESCRIPTIVE TEXT (descriptions, titles, names):
- Show the FULL text, don't truncate
- Format with proper line breaks and structure
- Highlight important parts with **bold**

If you find NUMERIC DATA (amounts, balances, counts):
- Format with appropriate decimals
- Add commas for thousands (1,234.56)
- Include units/tokens if identifiable

If you find IDENTIFIERS (addresses, IDs, hashes):
- Show them clearly
- Group related data together
- Use consistent formatting

If you find TIMESTAMPS:
- Format in readable date/time
- Show relative time if recent

If you find RANKED/SORTED DATA:
- Number the items (1, 2, 3...)
- Show the ranking criteria
- Highlight top entries

ADAPT your response format to the data structure:
- Tables with descriptions → Show full text content
- Tables with balances → Show rankings or totals
- Tables with events → Show chronological order
- Tables with relationships → Show connections

The format should EMERGE from the data, not be predetermined!

PARSING get_table_details RESPONSE - THIS IS YOUR DATA SOURCE:
The "📄 Sample Data" section contains the ONLY data you should use.

Whatever rows you see (Row 1, Row 2, Row 3, etc.):
- MEMORIZE the exact proposalId values
- MEMORIZE the exact description text
- MEMORIZE all other field values

These are the ONLY values you can use in your Final Answer.
If the data shows certain proposal IDs and descriptions, use ONLY those.
DO NOT invent different proposals or change any values!

FORMAT YOUR RESPONSES DYNAMICALLY:

For proposals, extract from YOUR actual data:
- proposalId → format as "Proposal #X"
- description → show the full text
- block_timestamp → format as date
- transaction_hash → shorten to first 6 chars

Use markdown headers and clean formatting:
## Latest Proposals

Then list each proposal with its ACTUAL data from the Sample Data rows.

---

For delegates/voting power:

## Top Delegates by Voting Power

| Rank | Delegate | Voting Power | % of Total |
|------|----------|-------------|------------|
| 1 | 0x123...abc | 5,234,567 CTX | 15.2% |
| 2 | 0x456...def | 3,456,789 CTX | 10.1% |
| 3 | 0x789...ghi | 2,345,678 CTX | 6.8% |

For general data:

## Query Results

**Summary:** Brief description of what was found

### Key Findings:
- ✅ Point 1 with relevant data
- ✅ Point 2 with relevant data  
- ✅ Point 3 with relevant data

⚠️ ONLY use data that's ACTUALLY in the response - don't add extra details!

TOKEN SYMBOL DETECTION:
- Use describe_table for governance tables to identify the project
- If governance_beta schema is used, check for project-specific schemas like "ctx"
- governance_beta is shared by multiple projects - identify which one by:
  * Using describe_table to get project metadata
  * Checking for project-specific schemas (ctx = Cryptex/CTX)
- Don't assume "beta" means BETA token - it's just a schema version
- Format all numbers with the correctly identified token symbol`;

    let conversationHistory = '';
    const maxSteps = 15; // Allow more steps to complete complex queries
    
    for (let i = 0; i < maxSteps; i++) {
      console.log(`\n📍 Step ${i + 1}/${maxSteps} - Starting...`);
      
      sendEvent('step', { 
        stepNumber: i + 1, 
        status: 'thinking',
        message: 'Parsed is analyzing...'
      });
      
      const prompt = `${systemPrompt}

User Question: ${input}

Conversation so far:
${conversationHistory}

What is your next thought and action?`;

      console.log(`🤔 Sending prompt to Claude...`);
      const response = await claude.invoke(prompt);
      const responseText = response.content.toString();
      
      console.log(`✅ Claude responded (${responseText.length} chars)`);
      console.log(`📄 Full response:`, responseText);
      
      // Check for final answer - but ONLY if it starts with "Final Answer:" and doesn't continue with actions
      const finalAnswerMatch = responseText.match(/^Final Answer:\s*(.+)$/ms);
      console.log(`🔍 Final Answer match:`, !!finalAnswerMatch);
      if (finalAnswerMatch) {
        const potentialAnswer = finalAnswerMatch[1];
        // Check if this is truly a final answer (no Thought/Action/Action Input after it)
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
      
      // Check if Claude is asking for clarification (more specific checks)
      if ((responseText.includes('need clarification') || responseText.includes('unclear what') || 
           responseText.includes('ambiguous query') || responseText.includes('Could you clarify')) &&
          !responseText.includes('Action:')) {
        console.log('⚠️ Query needs clarification');
        sendEvent('final', {
          answer: responseText,
          totalSteps: i + 1
        });
        clearTimeout(requestTimeout);
        return res.end();
      }
      
      // Parse action using same logic as main endpoint
      const thoughtMatch = responseText.match(/Thought:\s*([^\n]+)/);
      const actionMatch = responseText.match(/Action:\s*(\w+)/);
      
      console.log(`🔍 Parsing step ${i + 1}:`);
      console.log(`  - Thought match:`, !!thoughtMatch);
      console.log(`  - Action match:`, !!actionMatch);
      
      // Send the thought immediately if we have one
      if (thoughtMatch && thoughtMatch[1]) {
        console.log(`💭 Sending thinking event for step ${i + 1}: ${thoughtMatch[1].substring(0, 50)}...`);
        sendEvent('thinking', {
          stepNumber: i + 1,
          thought: thoughtMatch[1],
          message: `Step ${i + 1}: ${thoughtMatch[1]}`
        });
      }
      
      // Use balanced brace matching for Action Input
      let inputMatch = null;
      const actionInputIndex = responseText.indexOf('Action Input:');
      if (actionInputIndex !== -1) {
        const afterActionInput = responseText.substring(actionInputIndex + 13).trim();
        if (afterActionInput.startsWith('{')) {
          let braceCount = 0;
          let endIndex = -1;
          for (let j = 0; j < afterActionInput.length; j++) {
            if (afterActionInput[j] === '{') braceCount++;
            if (afterActionInput[j] === '}') braceCount--;
            if (braceCount === 0) {
              endIndex = j + 1;
              break;
            }
          }
          if (endIndex > 0) {
            inputMatch = ['', afterActionInput.substring(0, endIndex)];
          }
        }
      }
      
      if (!inputMatch) {
        inputMatch = responseText.match(/Action Input:\s*({.*?})/s) ||
                     responseText.match(/Action Input:\s*({})/);
      }
      
      if (responseText.includes('Observation:')) {
        // Claude is hallucinating, extract valid action
        const validPart = responseText.split('Observation:')[0];
        const thoughtMatch2 = validPart.match(/Thought:\s*([^\n]+)/);
        const actionMatch2 = validPart.match(/Action:\s*(\w+)/);
        const inputMatch2 = validPart.match(/Action Input:\s*({.*?})/s);
        
        if (actionMatch2 && inputMatch2) {
          const thought = thoughtMatch2?.[1] || 'Processing...';
          const toolName = actionMatch2[1];
          let jsonStr = inputMatch2[1].trim();
          
          // Handle multi-line SQL queries and literal \n characters
          if (jsonStr.includes('\\n')) {
            // Handle pretty-printed JSON with literal \n
            if (jsonStr.includes(',\\n  ')) {
              jsonStr = jsonStr.replace(/,\\n\s*/g, ', ');
              jsonStr = jsonStr.replace(/\{\\n\s*/g, '{');
              jsonStr = jsonStr.replace(/\\n\s*\}/g, '}');
            }
          }
          
          // Special handling for execute_sql_query to ensure proper formatting
          if (toolName === 'execute_sql_query') {
            // Try to extract the query cleanly
            const queryMatch = jsonStr.match(/"query"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
            const dbMatch = jsonStr.match(/"database"\s*:\s*"([^"]+)"/);
            const limitMatch = jsonStr.match(/"limit"\s*:\s*(\d+)/);
            
            if (queryMatch) {
              let query = queryMatch[1];
              // Don't escape newlines - let them be part of the query
              // Just ensure the query is valid
              const params: any = { 
                query: query.replace(/\\n/g, '\n').replace(/\\"/g, '"')
              };
              if (dbMatch) params.database = dbMatch[1];
              if (limitMatch) params.limit = parseInt(limitMatch[1]);
              
              jsonStr = JSON.stringify(params);
            }
          }
          
          let toolInput: any;
        try {
          toolInput = JSON.parse(jsonStr);
        } catch (parseError) {
          console.error('JSON Parse Error:', parseError);
          console.error('Failed JSON string:', jsonStr);
          // Try to clean up common issues
          jsonStr = jsonStr.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
          try {
            toolInput = JSON.parse(jsonStr);
          } catch (secondError) {
            console.error('Second parse attempt failed:', secondError);
            continue; // Skip this malformed action
          }
        }
          
          console.log(`\n🔧 Tool: ${toolName}`);
          console.log(`💭 Thought: ${thought}`);
          console.log(`📊 Input:`, JSON.stringify(toolInput, null, 2));
          
          sendEvent('action', {
            stepNumber: i + 1,
            thought,
            tool: toolName,
            input: toolInput
          });
          
          try {
            console.log(`⏳ Executing ${toolName}...`);
            const startTime = Date.now();
            const result = await callTool(toolName, toolInput);
            const executionTime = Date.now() - startTime;
            console.log(`✅ Tool completed in ${executionTime}ms`);
            
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
            
            conversationHistory += `
Thought: ${thought}
Action: ${toolName}
Action Input: ${JSON.stringify(toolInput)}
Observation: ${formattedResult.substring(0, 1000)}

`;
          } catch (error) {
            sendEvent('error', {
              stepNumber: i + 1,
              tool: toolName,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      } else if (actionMatch && inputMatch) {
        const thought = thoughtMatch?.[1] || 'Processing...';
        const toolName = actionMatch[1];
        let jsonStr = inputMatch[1].trim();
        
        // Handle multi-line content and special characters
        // The problem is that the JSON has literal backslash-n instead of newline characters
        // We need to handle the case where "\n" appears in the string
        if (jsonStr.includes('\\n')) {
          // This JSON has literal \n that should be actual newlines
          // But we need to be careful not to break escaped newlines
          // First, let's see if this looks like pretty-printed JSON with literal \n
          if (jsonStr.includes(',\\n  ')) {
            // This is pretty-printed JSON with literal \n characters
            // Remove them to make it single-line JSON
            jsonStr = jsonStr.replace(/,\\n\s*/g, ', ');
            jsonStr = jsonStr.replace(/\{\\n\s*/g, '{');
            jsonStr = jsonStr.replace(/\\n\s*\}/g, '}');
          }
        }
        
        // Special handling for execute_sql_query to ensure proper formatting
        if (toolName === 'execute_sql_query') {
          // Try to extract the query cleanly
          const queryMatch = jsonStr.match(/"query"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
          const dbMatch = jsonStr.match(/"database"\s*:\s*"([^"]+)"/);
          const limitMatch = jsonStr.match(/"limit"\s*:\s*(\d+)/);
          
          if (queryMatch) {
            let query = queryMatch[1];
            // Don't escape newlines - let them be part of the query
            // Just ensure the query is valid
            const params: any = { 
              query: query.replace(/\\n/g, '\n').replace(/\\"/g, '"')
            };
            if (dbMatch) params.database = dbMatch[1];
            if (limitMatch) params.limit = parseInt(limitMatch[1]);
            
            jsonStr = JSON.stringify(params);
          }
        }
        
        let toolInput: any;
        try {
          toolInput = JSON.parse(jsonStr);
        } catch (parseError) {
          console.error('JSON Parse Error:', parseError);
          console.error('Failed JSON string:', jsonStr);
          // Try to clean up common issues
          jsonStr = jsonStr.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
          try {
            toolInput = JSON.parse(jsonStr);
          } catch (secondError) {
            console.error('Second parse attempt failed:', secondError);
            continue; // Skip this malformed action
          }
        }
        
        // Fix parameter names
        if (toolName === 'get_tables' && toolInput.schema && !toolInput.schema_name) {
          toolInput.schema_name = toolInput.schema;
          delete toolInput.schema;
        }
        
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
          
          conversationHistory += `
Thought: ${thought}
Action: ${toolName}
Action Input: ${JSON.stringify(toolInput)}
Observation: ${formattedResult.substring(0, 1000)}

`;
        } catch (error) {
          sendEvent('error', {
            stepNumber: i + 1,
            tool: toolName,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }
    
    // If we hit max steps, ask for final answer
    sendEvent('finalizing', { message: 'Preparing final answer...' });
    
    const finalPrompt = `Based on the information gathered, provide a Final Answer to: "${input}"

🚨 CRITICAL: GO BACK AND LOOK AT THE OBSERVATIONS 🚨

Find the observation where get_table_details returned "Sample Data (3 rows):"
Look at Row 1, Row 2, Row 3 - what are the EXACT values?

EXTRACT THE EXACT VALUES:
- What proposalId values do you see in Row 1, Row 2, Row 3?
- What description text do you see for each row?
- What timestamps do you see?

USE ONLY THOSE VALUES IN YOUR ANSWER.
If Row 1 has proposalId: X and description: Y, then write "Proposal #X: Y"
DO NOT use any other proposal numbers or descriptions!

⚠️ FINAL CHECK: Look at the Sample Data rows above.
If Row 3 says "description: CIP-38: Renew Market Making Agreement with DaVinci Trading"
Then you MUST write "CIP-38: Renew Market Making Agreement with DaVinci Trading"
NOT "CIP-38: Diversify Treasury" or any other text!

COPY THE EXACT TEXT - NO MODIFICATIONS!

${conversationHistory}

Final Answer (USE ONLY the exact text from Sample Data - NO ADDITIONS):`;

    const finalResponse = await claude.invoke(finalPrompt);
    let finalAnswer = finalResponse.content.toString();
    
    // Post-process to extract exact data if LLM fails to
    // Look for Sample Data in the conversation history
    if (conversationHistory.includes('Sample Data')) {
      // Extract actual proposals from the observation
      const sampleDataSection = conversationHistory.match(/Sample Data[\s\S]*?(?=\n\n|💡|$)/)?.[0];
      if (sampleDataSection) {
        const rows = sampleDataSection.match(/Row \d+:[\s\S]*?(?=Row \d+:|$)/g);
        if (rows) {
          const proposals = rows.map(row => {
            const id = row.match(/proposalId: (\d+)/)?.[1];
            const desc = row.match(/description: ([^\n]+)/)?.[1];
            const timestamp = row.match(/block_timestamp: ([^\n]+)/)?.[1];
            const tx = row.match(/transaction_hash: (0x[a-f0-9]+)/)?.[1];
            return { id, desc, timestamp, tx };
          }).filter(p => p.id && p.desc);
          
          // Check if LLM invented data
          const hasIncorrectData = proposals.some(p => {
            const cipMatch = p.desc.match(/CIP-(\d+)/);
            if (cipMatch) {
              const cipNum = cipMatch[1];
              // Check if the final answer has this CIP with wrong description
              const pattern = new RegExp(`CIP-${cipNum}:(?!.*${p.desc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`);
              return pattern.test(finalAnswer);
            }
            return false;
          });
          
          if (hasIncorrectData && proposals.length > 0) {
            console.warn('⚠️ Detected incorrect data in LLM response, using exact data from observations');
            finalAnswer = `## Latest Proposals\n\n${proposals.map(p => 
              `### Proposal #${p.id}\n**${p.desc}**\n- Created: ${p.timestamp || 'N/A'}\n- Tx: ${p.tx ? p.tx.substring(0, 10) + '...' : 'N/A'}`
            ).join('\n\n')}`;
          }
        }
      }
    }
    
    sendEvent('final', {
      answer: finalAnswer,
      totalSteps: maxSteps
    });
    
    console.log('\n🎉 ==================== REQUEST COMPLETED ====================');
    console.log(`📝 Query: ${input}`);
    console.log(`📊 Total Steps: ${maxSteps}`);
    console.log(`✅ Answer Length: ${finalAnswer.length} chars`);
    console.log('==============================================================\n');
    
    clearTimeout(requestTimeout);
    res.end();
    
  } catch (error) {
    console.error('\n❌ ==================== ERROR ====================');
    console.error('Error:', error);
    console.error('==================================================\n');
    
    sendEvent('error', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    res.end();
  }
}