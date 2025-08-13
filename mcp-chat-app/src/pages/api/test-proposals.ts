import type { NextApiRequest, NextApiResponse } from 'next';

const MCP_API_URL = 'https://mcp.parsed.xyz/mcp-sql/sse';

async function initMCPSession(): Promise<string> {
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
        clientInfo: { name: "test-client", version: "1.0.0" }
      },
      id: 1
    })
  });
  
  const sessionId = initResponse.headers.get('mcp-session-id') || `session-${Date.now()}`;
  
  await fetch(MCP_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'mcp-session-id': sessionId
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {}
    })
  });
  
  return sessionId;
}

// Test endpoint to directly query ProposalCreated table
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('\n========== PROPOSAL TEST STARTING ==========');
  
  try {
    // Initialize session
    const sessionId = await initMCPSession();
    console.log('Session ID:', sessionId);
    // Test 1: Try execute_sql_query with explicit column selection
    console.log('\nTest 1: execute_sql_query with explicit columns');
    const test1Response = await fetch(MCP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'mcp-session-id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "execute_sql_query",
          arguments: {
            query: "SELECT proposalId, proposer, description, block_timestamp FROM governance_beta.ProposalCreated_bd5e0 ORDER BY block_timestamp DESC LIMIT 3",
            database: "data",
            limit: 3
          }
        },
        id: Date.now()
      })
    });
    
    const test1Text = await test1Response.text();
    console.log('Test 1 Response:', test1Text.substring(0, 1000));
    
    // Test 2: Try get_table_details
    console.log('\nTest 2: get_table_details');
    const test2Response = await fetch(MCP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'mcp-session-id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "get_table_details",
          arguments: {
            table_name: "ProposalCreated_bd5e0",
            schema_name: "governance_beta"
          }
        },
        id: Date.now()
      })
    });
    
    const test2Text = await test2Response.text();
    console.log('Test 2 Response:', test2Text.substring(0, 1000));
    
    // Test 3: Try smart_query
    console.log('\nTest 3: smart_query');
    const test3Response = await fetch(MCP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'mcp-session-id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "smart_query",
          arguments: {
            search_term: "ProposalCreated",
            limit: 3,
            apply_decimals: false
          }
        },
        id: Date.now()
      })
    });
    
    const test3Text = await test3Response.text();
    console.log('Test 3 Response:', test3Text.substring(0, 1000));
    
    // Parse responses to check for description field
    const results = {
      test1: { 
        hasDescription: test1Text.includes('description'),
        response: test1Text.substring(0, 500)
      },
      test2: { 
        hasDescription: test2Text.includes('description'),
        response: test2Text.substring(0, 500)
      },
      test3: { 
        hasDescription: test3Text.includes('description'),
        response: test3Text.substring(0, 500)
      }
    };
    
    console.log('\n========== TEST RESULTS ==========');
    console.log('Test 1 (execute_sql_query) has description:', results.test1.hasDescription);
    console.log('Test 2 (get_table_details) has description:', results.test2.hasDescription);
    console.log('Test 3 (smart_query) has description:', results.test3.hasDescription);
    console.log('==================================\n');
    
    res.status(200).json({
      success: true,
      message: 'Test completed - check server logs for details',
      results
    });
    
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}