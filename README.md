# MCP Database Server

A Model Context Protocol (MCP) server that provides tools for interacting with databases, including PostgreSQL, DuckDB, and Google Cloud Storage (GCS) Parquet files.

## Prerequisites

- Node.js 22 or higher
- TypeScript
- PostgreSQL (for PostgreSQL features)
- Google Cloud credentials (optional, for read files from GCS)

## Project Structure

```plaintext
.
├── migrations
│   └── init.sql
├── src
│   ├── services
│   │   ├── duckdb.ts
│   │   ├── gcs.ts
│   │   └── postgres.ts
│   ├── tools
│   │   ├── duckdb
│   │   ├── sql
│   │   └── index.ts
│   ├── config.ts
│   ├── handlers.ts
│   ├── server.ts
│   ├── types.ts
│   └── utils.ts
├── Makefile
├── README.md
├── docker-compose.yml
├── package-lock.json
├── package.json
└── tsconfig.json
```

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

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (required)
- `LOG_LEVEL`: Logging level (debug, info, error) (default: info)
- `GCP_SERVICE_ACCOUNT`: Google Cloud service account credentials (optional, for GCS)

### GCS Authentication

For Google Cloud Storage, choose one method:

1.  Set the `GCP_SERVICE_ACCOUNT` environment variable with base64-encoded service account credentials.
2.  Use default credentials (e.g., GKE Workload Identity).

## Running the Server

### Debug with MCP Inspector

```bash
make debug
```

### Development Mode

```bash
make dev
```

### Production Mode

```bash
npm run build
npm start
```

## Available Tools

### Database Tools

-   `sql_query_read`: Execute SELECT queries
-   `sql_query_create`: Execute CREATE/INSERT statements
-   `sql_query_update`: Execute UPDATE statements
-   `sql_query_delete`: Execute DELETE statements

### DuckDB Tools

-   `duckdb_read_parquet_files`: Query Parquet files

## Development: Integrating a New Tool

To integrate a new tool into the MCP server, follow these steps:

### 1. Define the Tool

Create a new tool definition in the `src/tools` directory. You can organize tools into subdirectories based on their functionality (e.g., `src/tools/sql`, `src/tools/duckdb`).

For example, to create a new SQL tool, you might create a file named `src/tools/sql/my_new_tool.ts` with the following content:

```typescript
// src/tools/sql/my_new_tool.ts
import { Tool } from "@modelcontextprotocol/sdk/types";

export interface MyNewToolArgs {
    query: string;
}

export const myNewTool: Tool = {
    name: "sql_my_new_tool",
    description: "Executes a custom SQL query",
    inputSchema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "The SQL query to execute",
            },
        },
        required: ["query"],
    },
};
```

### 2. Implement the Tool Handler

Implement the tool's logic in `src/handlers.ts`. This involves creating a handler function that processes the tool's arguments and performs the desired action.

```typescript
// src/handlers.ts
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types";
import { myNewTool, MyNewToolArgs } from "./tools/sql/my_new_tool";
import { Pool } from 'pg';

export function createToolHandlers(pgPool: Pool | null) {
  return async (request: any) => {
    switch (request.params.name) {
      case "sql_my_new_tool": {
        if (!pgPool) {
          throw new Error("PostgreSQL is not configured");
        }
        const args = request.params.arguments as MyNewToolArgs;
        const result = await pgPool.query(args.query);
        return {
          content: [{ type: "text", text: JSON.stringify(result.rows) }],
        };
      }
      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  };
}
```

### 3. Register the Tool

Register the new tool in `src/tools/index.ts` to make it available to the MCP server.

```typescript
// src/tools/index.ts
import { Tool } from "@modelcontextprotocol/sdk/types";
import { sqlRead } from "./sql/read";
import { sqlCreate } from "./sql/create";
import { sqlUpdate } from "./sql/update";
import { sqlDelete } from "./sql/delete";
import { duckdbReadParquetFiles } from "./duckdb/read";
import { myNewTool } from "./sql/my_new_tool"; // Import the new tool

export const tools: Tool[] = [
  sqlRead,
  sqlCreate,
  sqlUpdate,
  sqlDelete,
  duckdbReadParquetFiles,
  myNewTool, // Add the new tool to the list
];
```

### Best Practices

-   Always define clear input schemas for your tools using TypeScript interfaces and the `inputSchema` property.
-   Handle errors gracefully and provide informative error messages.
-   Use TypeScript for type safety throughout your tool implementation.
-   Implement comprehensive logging to aid in debugging and monitoring.
-   Validate input arguments before processing to prevent unexpected behavior.
-   Refer to the existing tools in `src/tools` for examples of well-defined tools.
-   Implement tool handlers in `src/handlers.ts` to keep the server logic organized.

### Environment Variables

Sensitive information, such as API keys and database credentials, should be passed via environment variables. Use the `dotenv` package to load environment variables from a `.env` file.
