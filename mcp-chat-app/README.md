# MCP SQL Chat Application

A Next.js chat application that integrates with Parsed MCP SQL tools using LangChain and the ReAct framework for transparent reasoning and chain-of-thought processing.

## Features

- **Claude-like Chat Interface**: Clean, modern UI with differentiated user and assistant messages
- **LangChain Integration**: Powered by LangChain for advanced agent capabilities
- **LangSmith Tracing**: Full observability with LangSmith API integration
- **ReAct Framework**: Shows transparent reasoning chain and thought process
- **MCP SQL Tools**: Complete integration with all Parsed MCP SQL tools
- **Natural Language Processing**: Understands both commands and natural language queries
- **SQL Query Execution**: Direct SQL query execution with formatted results
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Prerequisites

- Node.js 18+ 
- npm or yarn
- MCP API credentials
- LangSmith API key

## Installation

1. Clone the repository:
```bash
cd mcp-chat-app
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create or update `.env.local` with your credentials:
```env
MCP_API_URL=https://mcp.parsed.xyz/mcp-sql/sse
MCP_API_KEY=your_mcp_api_key_here
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langsmith_api_key
LANGCHAIN_PROJECT=mcp-chat-app
ANTHROPIC_API_KEY=your_claude_api_key_here
```

## Running the Application

### Development Mode
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
npm run build
npm start
```

## Available MCP Tools

The application integrates with the following MCP SQL tools:

- `execute_sql_query` - Execute SQL queries against your database
- `describe_table` - Get table schema and metadata
- `test_connection` - Test database connections
- `get_database_overview` - Get comprehensive database structure
- `get_table_details` - Get detailed table information
- `find_project` - Find schemas and tables for a project
- `query_contract_decimals` - Query contract decimals
- `smart_query` - Smart query with automatic decimal conversion
- `get_schemas` - List all database schemas
- `get_tables` - List tables in a schema
- `get_columns` - Get columns for a table
- `query_information_schema` - Query information schema
- `find_column` - Find tables containing specific columns

## Usage Examples

### Direct Tool Commands
```
get_database_overview
execute_sql_query query="SELECT * FROM users LIMIT 10"
describe_table table_name=users
get_tables schema_name=public
```

### Natural Language Queries
- "Show me all tables in the public schema"
- "What's the structure of the users table?"
- "Find all tables with a column named 'email'"
- "Execute a query to count all records in the orders table"

## Project Structure

```
mcp-chat-app/
├── src/
│   ├── components/        # React components
│   │   ├── ChatMessage.tsx
│   │   ├── MessageInput.tsx
│   │   ├── QueryExecution.tsx
│   │   ├── ReactThoughtProcess.tsx
│   │   └── SqlResponseDisplay.tsx
│   ├── lib/               # Core libraries
│   │   ├── mcpTools.ts    # MCP tool definitions
│   │   ├── react-agent.ts # ReAct agent with LangChain
│   │   └── types.ts       # TypeScript types
│   ├── pages/            # Next.js pages
│   │   ├── api/          # API routes
│   │   └── index.tsx     # Main chat interface
│   └── styles/           # Global styles
├── .env.local            # Environment variables
├── package.json          # Dependencies
└── README.md            # Documentation
```

## Key Features Explained

### ReAct Framework
The application implements the ReAct (Reasoning + Acting) framework, which:
- Shows transparent reasoning for each query
- Breaks down complex tasks into steps
- Provides visibility into tool selection and execution
- Displays intermediate results and observations

### LangChain Integration
- Manages conversation memory and context
- Provides structured tool execution
- Enables complex agent behaviors
- Supports multiple LLM providers

### LangSmith Tracing
- Full observability of agent execution
- Performance monitoring
- Debug and analyze conversation flows
- Track token usage and costs

## Customization

### Adding New Tools
To add new MCP tools, update `src/lib/mcpTools.ts`:
```typescript
export const mcpTools = [
  // ... existing tools
  {
    name: 'your_new_tool',
    description: 'Description of your tool',
    parameters: {
      param1: { type: 'string', required: true },
      // ... other parameters
    },
  },
];
```

### Modifying the UI
- Components are in `src/components/`
- Styles use Tailwind CSS classes
- Global styles in `src/styles/globals.css`

## Troubleshooting

### Connection Issues
- Verify MCP_API_URL and MCP_API_KEY in `.env.local`
- Check network connectivity to MCP servers
- Ensure database credentials are correct

### LangChain Errors
- Verify LANGCHAIN_API_KEY is valid
- Check LangSmith project exists
- Ensure ANTHROPIC_API_KEY is set for Claude models

### Build Errors
- Clear `.next` folder and rebuild
- Update Node.js to version 18+
- Run `npm install` to ensure all dependencies are installed

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)
- Documentation: Check this README
- MCP Support: Contact Parsed support