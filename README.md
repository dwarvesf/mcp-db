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
│   └── 1743322886782_initial-schema.js
├── src
│   ├── resources
│   │   ├── gcs
│   │   ├── sql
│   │   └── index.ts
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
├── database.json
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

## Database Migrations

The project uses node-pg-migrate for managing database schema changes. Migrations are stored in the `migrations` directory and are written in JavaScript using ES modules syntax.

### Running Migrations

To apply all pending migrations:

```bash
npm run migrate:up
```

To roll back the last migration:

```bash
npm run migrate:down
```

### Creating New Migrations

To create a new migration file:

```bash
npm run migrate:create my_migration_name
```

This will create a new file in the `migrations` directory with a timestamp prefix, e.g., `migrations/20240330123456_my_migration_name.js`.

The migration file will contain `up` and `down` functions:
- `up`: Contains the changes to apply
- `down`: Contains the logic to reverse those changes

Example migration file:

```javascript
/** @type {import('node-pg-migrate').ColumnDefinitions | undefined} */
export const shorthands = undefined;

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
export async function up(pgm) {
  pgm.createTable('users', {
    id: 'id',
    name: { type: 'varchar(1000)', notNull: true },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });
}

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
export async function down(pgm) {
  pgm.dropTable('users');
}
```

### TimescaleDB Continuous Aggregates

TimescaleDB continuous aggregates cannot be created inside a transaction block, which is how node-pg-migrate runs migrations by default. To handle this, the project uses a separate SQL script for creating continuous aggregates:

1. Regular tables and indexes are created using migrations
2. Continuous aggregates are created using a separate SQL script that runs directly inside the Docker container

To set up the complete database schema:

```bash
npm run setup:db
```

This command runs both the migrations and the continuous aggregates setup script. The continuous aggregates script is executed inside the TimescaleDB Docker container to avoid transaction issues.

If you need to add new continuous aggregates, add them to the `scripts/setup-continuous-aggregates.sql` file.

### Migration Configuration

Database connection settings for migrations are stored in `database.json`:

```json
{
  "dev": {
    "driver": "pg",
    "user": "postgres",
    "password": "postgres",
    "host": "localhost",
    "port": 15432,
    "database": "postgres"
  },
  "prod": {
    "driver": "pg",
    "url": {"ENV": "DATABASE_URL"}
  }
}
```

## Running the Server

### Debug with MCP Inspector

```bash
make debug
```

### Development Mode

```bash
make dev
```

This will start the server on port 3001 using SSE transport.

### Client Configuration

To connect your MCP client to the local server, add the following configuration:

```json
{
  "mcpServers": {
    "mcp-db": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "--net=host",
        "supercorp/supergateway",
        "--sse",
        "http://localhost:3001/sse"
      ]
    }
  }
}
```

### Production Mode

```bash
npm run build
npm start
```

### Running with npx from GitHub

You can run the server directly using npx without cloning the repository:

```bash
npx github:dwarvesf/mcp-db
```

If you encounter any issues with the above command, you can use the full GitHub URL:

```bash
npx https://github.com/dwarvesf/mcp-db.git
```

With options:

```bash
npx github:dwarvesf/mcp-db --log-level=debug --gcs-bucket=my-bucket
```

This will download and execute the package directly from GitHub. Note that you'll still need to provide any required environment variables:

```bash
DATABASE_URL=postgres://user:password@localhost:5432/db npx github:dwarvesf/mcp-db
```

## Available Tools

### Database Tools

-   `sql_query_read`: Execute SELECT queries
-   `sql_query_create`: Execute CREATE/INSERT statements

### DuckDB Tools

-   `duckdb_read_parquet_files`: Query Parquet files

### GCS Tools

-   `gcs_directory_tree`: Fetch the directory tree structure from a GCS bucket with pagination support (limit/offset)
    ```json
    {
      "name": "gcs_directory_tree",
      "arguments": {
        "prefix": "data/",
        "delimiter": "/",
        "limit": 100,
        "offset": 0
      }
    }
    ```

## Development: Integrating a New Tool

To integrate a new tool into the MCP server, follow these steps:

### 1. Define the Tool

Create a new tool definition in the `src/tools` directory. Organize tools into subdirectories based on their functionality (e.g., `src/tools/sql`, `src/tools/duckdb`). Each tool should have its own file.

For example, to create a new SQL tool, create a file named `src/tools/sql/my_new_tool.ts` with the following content:

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

-   `MyNewToolArgs`: Defines the structure of the arguments that the tool accepts. This interface is used for type-checking the arguments passed to the tool handler.
-   `myNewTool`: This object defines the tool itself.
    -   `name`: A unique name for the tool. This name is used to identify the tool when it is called.
    -   `description`: A human-readable description of the tool.
    -   `inputSchema`: A JSON schema that defines the structure of the input arguments. This schema is used to validate the arguments passed to the tool.

### 2. Implement the Tool Handler

Implement the tool's logic within the `createToolHandlers` function in `src/handlers.ts`. This function returns an asynchronous function that processes the tool's arguments and performs the desired action.

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

-   The `createToolHandlers` function takes a `pgPool` argument, which is a PostgreSQL connection pool. This allows the tool handler to access the PostgreSQL database.
-   The `switch` statement handles the different tool names.
-   The `request.params.arguments` object contains the arguments passed to the tool. These arguments are cast to the `MyNewToolArgs` interface for type safety.
-   The tool handler performs the desired action and returns a `content` object containing the result.

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

-   Import the new tool from its file.
-   Add the new tool to the `tools` array.

### 4. Test the New Tool

After adding the new tool, test it to ensure it is working correctly. You can use the MCP Inspector to call the tool and verify that it returns the expected result.

### Best Practices

-   Always define clear input schemas for your tools using TypeScript interfaces and the `inputSchema` property.
-   Handle errors gracefully and provide informative error messages.
-   Use TypeScript for type safety throughout your tool implementation.
-   Implement comprehensive logging to aid in debugging and monitoring.
-   Validate input arguments before processing to prevent unexpected behavior.
-   Refer to the existing tools in `src/tools` for examples of well-defined tools.
-   Implement tool handlers in `src/handlers.ts` to keep the server logic organized.
-   Use environment variables for sensitive information, such as API keys and database credentials.

### Environment Variables

Sensitive information, such as API keys and database credentials, should be passed via environment variables. Use the `dotenv` package to load environment variables from a `.env` file.
