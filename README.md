# MCP Database Server

A Model Context Protocol (MCP) server that provides tools for interacting with databases, including PostgreSQL, DuckDB, and Google Cloud Storage (GCS) Parquet files.

## Prerequisites

- Node.js 22 or higher
- TypeScript
- PostgreSQL (for PostgreSQL features)
- Google Cloud credentials (optional, for read files from GCS)

## Project Structure

- `src/`: Source code
  - `config.ts`: Configuration management
  - `duckdb.ts`: DuckDB integration
  - `gcs.ts`: Google Cloud Storage integration
  - `postgres.ts`: PostgreSQL database integration
  - `server.ts`: Main server implementation

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mcp-db
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

### Environment Variables and CLI Arguments
- `--database-url`: PostgreSQL connection string (required)
- `--log-level`: Logging level (debug, info, error) (default: info)

### GCS Authentication
For Google Cloud Storage, choose one method:
1. Set the `GCP_SERVICE_ACCOUNT` environment variable with base64-encoded service account credentials
2. Use default credentials (e.g., GKE Workload Identity)

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Example Configurations

```bash
npm start -- --database-url "postgresql://user:password@localhost:5432/mydb"
```

## Available Tools

### Database Tools
- `sql_query_read`: Execute SELECT queries
- `sql_query_create`: Execute CREATE/INSERT statements
- `sql_query_update`: Execute UPDATE statements
- `sql_query_delete`: Execute DELETE statements

### DuckDB Tools
- `duckdb_read_parquet_files`: Query Parquet files

## Documentation

Additional documentation can be found in the `docs/` directory:
- `docs/llm-full.md`: Comprehensive documentation
- `docs/requirements-mcp.md`: MCP requirements
- `docs/sdk.md`: SDK-related documentation

## Development: Integrating a New Tool

To integrate a new tool into an MCP server, follow these key steps:

### 1. Import Required Modules

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
```

### 2. Define Tool Interfaces and Definitions

```typescript
// Define an interface for tool arguments
interface MyToolArgs {
  param1: string;
  param2?: number;
}

// Create a tool definition with input schema
const myCustomTool: Tool = {
  name: "my_custom_tool",
  description: "A description of what the tool does",
  inputSchema: {
    type: "object",
    properties: {
      param1: {
        type: "string",
        description: "Description of param1"
      },
      param2: {
        type: "number",
        description: "Optional description of param2"
      }
    },
    required: ["param1"]
  }
};
```

### 3. Set Up Server with Request Handlers

```typescript
const server = new Server(
  {
    name: "My MCP Server",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Handle tool calls
server.setRequestHandler(
  CallToolRequestSchema,
  async (request) => {
    switch (request.params.name) {
      case "my_custom_tool": {
        const args = request.params.arguments as MyToolArgs;
        // Implement tool logic here
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({ result: "Tool execution result" }) 
          }]
        };
      }
      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  }
);

// List available tools
server.setRequestHandler(
  ListToolsRequestSchema, 
  async () => ({
    tools: [myCustomTool]
  })
);

// Connect server to transport
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Best Practices

- Always define clear input schemas for your tools
- Handle errors gracefully
- Use TypeScript for type safety
- Implement comprehensive logging
- Validate input arguments before processing

### Environment Variables

Sensitive information like API keys should be passed via environment variables:

```bash
TOOL_API_KEY=your_secret_key npm start
