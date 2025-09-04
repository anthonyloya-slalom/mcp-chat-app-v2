import type { NextApiRequest, NextApiResponse } from 'next';

const MCP_API_URL = 'https://mcp.ourtilt.ai/mcp/sse';

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('\n========== LEAVE DATA TEST STARTING ==========');
  
  try {
    const sessionId = await initMCPSession();
    console.log('Session ID:', sessionId);
    
    console.log('\nTest 1: query_leaves_data');
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
          name: "query_leaves_data",
          arguments: {
            filters: {
              leave_type: "caregiving"
            }
          }
        },
        id: Date.now()
      })
    });
    
    const test1Text = await test1Response.text();
    console.log('Test 1 Response:', test1Text.substring(0, 1000));
    
    console.log('\nTest 2: analyze_caregiving_leaves');
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
          name: "analyze_caregiving_leaves",
          arguments: {}
        },
        id: Date.now()
      })
    });
    
    const test2Text = await test2Response.text();
    console.log('Test 2 Response:', test2Text.substring(0, 1000));
    
    console.log('\nTest 3: leave_duration_stats');
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
          name: "leave_duration_stats",
          arguments: {
            leave_type: "caregiving"
          }
        },
        id: Date.now()
      })
    });
    
    const test3Text = await test3Response.text();
    console.log('Test 3 Response:', test3Text.substring(0, 1000));
    
    const results = {
      test1: { 
        hasLeaveData: test1Text.includes('leave') || test1Text.includes('caregiving'),
        response: test1Text.substring(0, 500)
      },
      test2: { 
        hasPatternData: test2Text.includes('intermittent') || test2Text.includes('continuous'),
        response: test2Text.substring(0, 500)
      },
      test3: { 
        hasDurationData: test3Text.includes('duration') || test3Text.includes('days'),
        response: test3Text.substring(0, 500)
      }
    };
    
    console.log('\n========== TEST RESULTS ==========');
    console.log('Test 1 (query_leaves_data) has leave data:', results.test1.hasLeaveData);
    console.log('Test 2 (analyze_caregiving_leaves) has pattern data:', results.test2.hasPatternData);
    console.log('Test 3 (leave_duration_stats) has duration data:', results.test3.hasDurationData);
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