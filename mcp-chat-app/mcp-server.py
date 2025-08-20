#!/usr/bin/env python3
"""
Simple MCP Server with Hardcoded Leave Data
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from datetime import datetime, timedelta
import json
import asyncio
import uvicorn
from typing import Dict, Any, List, Optional
import statistics

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Hardcoded leave data
LEAVE_DATA = [
    {"leave_id": "336f2f22", "employee_id": "45751", "leave_type": "CAREGIVER", "expected_leave_date": "2024-11-07", "expected_return_date": "2025-11-08", "is_leave_continuous": False, "is_leave_intermittent": True, "caregiver_type": "CHILD_U18"},
    {"leave_id": "3ca1f1ac", "employee_id": "97284", "leave_type": "CAREGIVER", "expected_leave_date": "2024-03-11", "expected_return_date": "2024-04-12", "is_leave_continuous": True, "is_leave_intermittent": False, "caregiver_type": "PARENT"},
    {"leave_id": "ee88c3cf", "employee_id": "44632", "leave_type": "CAREGIVER", "expected_leave_date": "2023-11-16", "expected_return_date": "2024-11-15", "is_leave_continuous": False, "is_leave_intermittent": True, "caregiver_type": "CHILD_O18"},
    {"leave_id": "489fed05", "employee_id": "42950", "leave_type": "CAREGIVER", "expected_leave_date": "2024-12-16", "expected_return_date": "2025-02-04", "is_leave_continuous": True, "is_leave_intermittent": False, "caregiver_type": "PARENT"},
    {"leave_id": "63e51a92", "employee_id": "49769", "leave_type": "CAREGIVER", "expected_leave_date": "2023-05-13", "expected_return_date": "2023-05-25", "is_leave_continuous": True, "is_leave_intermittent": False, "caregiver_type": "PARENT"},
    {"leave_id": "d83bfe88", "employee_id": "44649", "leave_type": "CAREGIVER", "expected_leave_date": "2023-11-10", "expected_return_date": "2023-11-13", "is_leave_continuous": False, "is_leave_intermittent": False, "caregiver_type": "CHILD_U18"},
    {"leave_id": "85e1c2d3", "employee_id": "44821", "leave_type": "CAREGIVER", "expected_leave_date": "2025-02-25", "expected_return_date": "2025-02-28", "is_leave_continuous": True, "is_leave_intermittent": False, "caregiver_type": "PARENT"},
    {"leave_id": "ffa18c4e", "employee_id": "46379", "leave_type": "CAREGIVER", "expected_leave_date": "2025-05-22", "expected_return_date": "2025-08-28", "is_leave_continuous": True, "is_leave_intermittent": False, "caregiver_type": "PARENT"},
    {"leave_id": "ca1d5e5e", "employee_id": "44825", "leave_type": "CAREGIVER", "expected_leave_date": "2023-03-06", "expected_return_date": "2023-03-30", "is_leave_continuous": False, "is_leave_intermittent": True, "caregiver_type": "CHILD_U18"},
    {"leave_id": "3c251b93", "employee_id": "42759", "leave_type": "CAREGIVER", "expected_leave_date": "2023-03-14", "expected_return_date": "2024-03-13", "is_leave_continuous": False, "is_leave_intermittent": False, "caregiver_type": "SPOUSE"},
    {"leave_id": "b06ad8e0", "employee_id": "44184", "leave_type": "CAREGIVER", "expected_leave_date": "2025-03-31", "expected_return_date": "2025-05-06", "is_leave_continuous": True, "is_leave_intermittent": False, "caregiver_type": "PARENT"},
    {"leave_id": "e45671c3", "employee_id": "44900", "leave_type": "CAREGIVER", "expected_leave_date": "2023-02-01", "expected_return_date": "2023-02-08", "is_leave_continuous": False, "is_leave_intermittent": False, "caregiver_type": "PARENT"},
    {"leave_id": "f36f0065", "employee_id": "46379", "leave_type": "CAREGIVER", "expected_leave_date": "2025-08-14", "expected_return_date": "2025-11-10", "is_leave_continuous": True, "is_leave_intermittent": False, "caregiver_type": "PARENT"},
    {"leave_id": "8f14381a", "employee_id": "44649", "leave_type": "CAREGIVER", "expected_leave_date": "2024-05-02", "expected_return_date": "2024-05-09", "is_leave_continuous": True, "is_leave_intermittent": False, "caregiver_type": "CHILD_U18"},
    {"leave_id": "a49d14cc", "employee_id": "42886", "leave_type": "CAREGIVER", "expected_leave_date": "2023-01-24", "expected_return_date": "2023-12-31", "is_leave_continuous": False, "is_leave_intermittent": False, "caregiver_type": "PARENT"},
]

# Store active sessions
sessions: Dict[str, Dict[str, Any]] = {}

def calculate_days_between(start_date: str, end_date: str) -> int:
    """Calculate days between two dates"""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        return (end - start).days
    except:
        return 0

def process_snowflake_query(query: str) -> Dict[str, Any]:
    """Process a mock Snowflake query with hardcoded data"""
    query_lower = query.lower()
    
    # Calculate average duration
    if "avg" in query_lower and "datediff" in query_lower:
        durations = []
        for record in LEAVE_DATA:
            if record.get("expected_leave_date") and record.get("expected_return_date"):
                days = calculate_days_between(
                    record["expected_leave_date"],
                    record["expected_return_date"]
                )
                if days > 0:
                    durations.append(days)
        
        if durations:
            avg_duration = sum(durations) / len(durations)
            return {
                "columns": ["AVG_DURATION_DAYS", "TOTAL_LEAVES", "MIN_DAYS", "MAX_DAYS"],
                "rows": [[
                    round(avg_duration, 1),
                    len(durations),
                    min(durations),
                    max(durations)
                ]]
            }
    
    # Count continuous vs intermittent
    elif "continuous" in query_lower or "intermittent" in query_lower:
        continuous_count = sum(1 for r in LEAVE_DATA if r.get("is_leave_continuous"))
        intermittent_count = sum(1 for r in LEAVE_DATA if r.get("is_leave_intermittent"))
        
        return {
            "columns": ["CONTINUOUS_LEAVES", "INTERMITTENT_LEAVES", "TOTAL"],
            "rows": [[continuous_count, intermittent_count, len(LEAVE_DATA)]]
        }
    
    # Caregiver type breakdown
    elif "caregiver_type" in query_lower:
        type_counts = {}
        for record in LEAVE_DATA:
            ctype = record.get("caregiver_type", "UNKNOWN")
            type_counts[ctype] = type_counts.get(ctype, 0) + 1
        
        return {
            "columns": ["CAREGIVER_TYPE", "COUNT"],
            "rows": [[k, v] for k, v in type_counts.items()]
        }
    
    # Default: return all leave statistics
    else:
        durations = []
        for record in LEAVE_DATA:
            if record.get("expected_leave_date") and record.get("expected_return_date"):
                days = calculate_days_between(
                    record["expected_leave_date"],
                    record["expected_return_date"]
                )
                if days > 0:
                    durations.append(days)
        
        avg_duration = sum(durations) / len(durations) if durations else 0
        continuous_count = sum(1 for r in LEAVE_DATA if r.get("is_leave_continuous"))
        intermittent_count = sum(1 for r in LEAVE_DATA if r.get("is_leave_intermittent"))
        
        return {
            "columns": ["METRIC", "VALUE"],
            "rows": [
                ["Average Duration (days)", round(avg_duration, 1)],
                ["Total Leaves", len(LEAVE_DATA)],
                ["Continuous Leaves", continuous_count],
                ["Intermittent Leaves", intermittent_count],
                ["Min Duration (days)", min(durations) if durations else 0],
                ["Max Duration (days)", max(durations) if durations else 0]
            ]
        }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "MCP Server with Mock Data"}

@app.get("/sse")
async def sse_endpoint():
    """SSE endpoint that returns the session URL"""
    session_id = f"session-{datetime.now().timestamp()}"
    sessions[session_id] = {"initialized": False, "tools": {}}
    
    async def generate():
        yield f"data: /messages/?session_id={session_id}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")

@app.post("/messages/")
async def handle_message(request: Request, session_id: str = None):
    """Handle MCP protocol messages"""
    if not session_id:
        session_id = f"session-{datetime.now().timestamp()}"
    
    if session_id not in sessions:
        sessions[session_id] = {"initialized": False, "tools": {}}
    
    body = await request.json()
    method = body.get("method")
    params = body.get("params", {})
    msg_id = body.get("id")
    
    # Handle initialize
    if method == "initialize":
        sessions[session_id]["initialized"] = True
        return JSONResponse({
            "jsonrpc": "2.0",
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {
                        "listChanged": True
                    }
                },
                "serverInfo": {
                    "name": "mock-mcp-server",
                    "version": "1.0.0"
                }
            },
            "id": msg_id
        })
    
    # Handle initialized notification
    elif method == "notifications/initialized":
        return JSONResponse({"jsonrpc": "2.0", "result": "ok"})
    
    # Handle list tools
    elif method == "tools/list":
        return JSONResponse({
            "jsonrpc": "2.0",
            "result": {
                "tools": [
                    {
                        "name": "snowflake_query",
                        "description": "Execute SQL queries on leave data",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "query": {
                                    "type": "string",
                                    "description": "SQL query to execute"
                                }
                            },
                            "required": ["query"]
                        }
                    }
                ]
            },
            "id": msg_id
        })
    
    # Handle tool calls
    elif method == "tools/call":
        tool_name = params.get("name")
        tool_args = params.get("arguments", {})
        
        if tool_name == "snowflake_query":
            query = tool_args.get("query", "")
            result = process_snowflake_query(query)
            
            # Format result as text
            text_result = []
            if "columns" in result and "rows" in result:
                # Add column headers
                text_result.append(" | ".join(str(c) for c in result["columns"]))
                text_result.append("-" * 50)
                # Add rows
                for row in result["rows"]:
                    text_result.append(" | ".join(str(v) for v in row))
            
            return JSONResponse({
                "jsonrpc": "2.0",
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": "\n".join(text_result)
                        }
                    ]
                },
                "id": msg_id
            })
        else:
            return JSONResponse({
                "jsonrpc": "2.0",
                "error": {
                    "code": -32601,
                    "message": f"Unknown tool: {tool_name}"
                },
                "id": msg_id
            })
    
    # Unknown method
    else:
        return JSONResponse({
            "jsonrpc": "2.0",
            "error": {
                "code": -32601,
                "message": f"Method not found: {method}"
            },
            "id": msg_id
        })

if __name__ == "__main__":
    print("🚀 Starting MCP Server with Mock Leave Data on http://localhost:8000")
    print("📊 Loaded {} leave records".format(len(LEAVE_DATA)))
    uvicorn.run(app, host="0.0.0.0", port=8000)