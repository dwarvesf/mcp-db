# MCP Database Server

A Model Context Protocol (MCP) server built with `mcp-framework` that provides tools and resources for interacting with databases (PostgreSQL via DuckDB) and Google Cloud Storage (GCS).

## Prerequisites

- Node.js 22 or higher
- TypeScript
- PostgreSQL (required for database features)
- Google Cloud credentials (optional, for GCS features)
- [Devbox](https://www.jetpack.io/devbox/) (for local development using `make` commands)

## Project Structure

```plaintext
.
├── docs
│   ├── assets
│   │   └── etl.png
│   ├── etl-workflow.md
│   └── setup-with-claude-desktop.md
├── migrations
│   ├── 1743322886782_initial-schema.cjs
│   └── 1743323460433_continuous-aggregates.cjs
├── scripts
│   └── setup-continuous-aggregates.sql
├── src
│   ├── resources       # MCP Resource definitions
│   │   ├── gcs_objects.ts
│   │   └── sql_tables.ts
│   ├── services        # Service initializers (DB connections, GCS client)
│   │   ├── duckdb.ts
│   │   ├── gcs.ts
│   │   └── postgres.ts
│   ├── tools           # MCP Tool definitions
│   │   ├── duckdb_insert.ts
│   │   ├── duckdb_query.ts
│   │   ├── duckdb_read_parquet.ts
│   │   └── gcs_directory_tree.ts
│   ├── utils           # Utility functions (logging, formatting)
│   │   ├── index.ts
│   │   └── logger.ts
│   ├── config.ts       # Configuration loading and validation
│   ├── index.ts        # Main server entry point
│   └── utils.ts        # Deprecated utils? (Consider removing if unused)
├── .env.example        # Example environment variables
├── .gitignore
├── CLAUDE.md
├── Dockerfile
├── MIGRATION.md
├── Makefile            # Development commands
├── README.md
├── database.json       # Migration configuration
├── devbox.json         # Devbox configuration
├── devbox.lock
├── docker-compose.yml  # Docker setup for DBs
├── fly.toml            # Fly.io deployment config
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

2. Install dependencies (using Devbox is recommended for consistency):

    ```bash
    devbox install
    # Or using npm directly if not using Devbox
    # npm install
    ```

3. Copy `.env.example` to `.env` and fill in your environment variables.

    ```bash
    cp .env.example .env
    # Edit .env with your details
    ```

4. Build the project:

    ```bash
    # Using make (requires Devbox)
    make build
    # Or using npm directly
    # npm run build
    ```

## Configuration

### Environment Variables

Configure the server using these environment variables (or command-line arguments):

- `DATABASE_URL`: PostgreSQL connection string (required unless running with supergateway).
- `DATABASE_URLS`: Comma-separated list of `alias=url` pairs for multiple database connections (alternative to `DATABASE_URL`).
- `LOG_LEVEL`: Logging level (`debug`, `info`, `error`). Default: `info`.
- `GCS_BUCKET`: Default Google Cloud Storage bucket name (optional).
- `GCP_SERVICE_ACCOUNT`: Base64 encoded Google Cloud service account key JSON (optional, for GCS authentication).
- `GCS_KEY_ID` / `GCS_SECRET`: Alternative GCS credentials specifically for DuckDB's `httpfs` extension (optional).
- `TRANSPORT`: Transport type (`stdio` or `sse`). Default: `stdio`.
- `PORT`: Port number for SSE transport. Default: `3001`.
- `HOST`: Hostname for SSE transport. Default: `localhost`.
- `API_KEY`: Optional API key for securing the server (if set, clients must provide it in the `Authorization: Bearer <key>` header).

Command-line arguments (e.g., `--port 8080`, `--gcs-bucket my-bucket`) override environment variables. See `src/config.ts` for details.

## Database Migrations

The project uses `node-pg-migrate` for managing PostgreSQL schema changes. See the "Database Migrations" section in the original README content above for details on running and creating migrations.

**Note:** The `npm run setup:db` command mentioned previously might need review or updates based on the current setup.

## Running the Server

Use the `Makefile` for convenient development commands (requires Devbox):

```bash
# Run in development mode (builds and starts with nodemon for auto-restarts)
# Uses SSE transport by default on port 3001
make dev

# Run tests (if configured)
# make test

# Build for production
# make build
```

To run without `make` (after `npm run build`):

```bash
# Run with stdio transport
node dist/index.js --transport stdio

# Run with SSE transport on default port 3001
node dist/index.js --transport sse

# Run with SSE on a different port
node dist/index.js --transport sse --port 8080
```

### Client Configuration

To connect your MCP client (e.g., `mcp-cli`, Claude Desktop) to the local server:

**For SSE Transport (e.g., on port 3001):**

```json
{
  "mcpServers": {
    "mcp-db-local": {
      "command": "node",
      "args": [
        "/path/to/mcp-db/dist/index.js", // Adjust path if needed
        "--transport", "sse",
        "--port", "3001" // Match the port the server is running on
      ],
      // Add "env" if API_KEY is set
      // "env": { "API_KEY": "your-secret-key" }
    }
  }
}
```

*(Note: The Docker/supergateway example from the previous README might be outdated or specific to a different deployment setup.)*

**For Stdio Transport:**

```json
{
  "mcpServers": {
    "mcp-db-local": {
      "command": "node",
      "args": [
        "/path/to/mcp-db/dist/index.js", // Adjust path if needed
        "--transport", "stdio"
      ],
      // Add "env" if API_KEY is set
      // "env": { "API_KEY": "your-secret-key" }
    }
  }
}
```

### Running with npx from GitHub

You can run the server directly using npx (requires build step in package):

```bash
# Ensure required env vars are set
export DATABASE_URL="postgresql://user:password@localhost:5432/db"
export GCS_BUCKET="my-bucket"

npx github:dwarvesf/mcp-db --transport sse --port 3001
```

## Available Tools

- `duckdb_insert`: Executes an `INSERT` statement on the attached PostgreSQL database via DuckDB. Only `INSERT` queries are allowed.
- `duckdb_query`: Executes a read-only SQL query directly on the attached PostgreSQL database (`postgres_db`) using DuckDB's `postgres_query` function. Automatically prefixes unqualified table names (e.g., `my_table` becomes `postgres_db.public.my_table`).
- `duckdb_read_parquet`: Queries Parquet files using DuckDB (likely from GCS if configured).
- `duckdb_update`: Executes an `UPDATE` statement on the attached PostgreSQL database via DuckDB.
- `gcs_directory_tree`: Fetches the directory tree structure from a GCS bucket with pagination support.

## Available Resources

- `mcp://gcs/objects`: Lists objects in the configured GCS bucket.
- `mcp://db/tables`: Lists all tables and their columns in the configured PostgreSQL database.

## Development: Integrating a New Tool/Resource

This project uses `mcp-framework`. To add a new tool or resource:

1. **Create the Class:**
    - Create a new `.ts` file in `src/tools/` or `src/resources/`.
    - Define a class that extends `MCPTool` or `MCPResource`.
    - Implement the required properties (`name`, `description`, `schema` for tools) and methods (`execute` for tools, `read` for resources).
    - Use Zod in the `schema` property for input validation (tools).
    - Initialize any dependencies (like DB connections or GCS clients) within the class, often in the constructor, potentially using services from `src/services/` or configuration from `src/config.ts`.

    *Example Tool (`src/tools/my_tool.ts`):*

    ```typescript
    import { MCPTool } from "mcp-framework";
    import { z } from "zod";
    import { formatSuccessResponse } from "../utils.js";
    import { getDuckDBConnection } from "../services/duckdb.js"; // Example dependency

    const MyToolInputSchema = z.object({
      param1: z.string().describe("Description for parameter 1"),
    });
    type MyToolInput = z.infer<typeof MyToolInputSchema>;

    export class MyTool extends MCPTool<MyToolInput> {
      name = "my_tool";
      description = "Description of what my tool does.";
      schema = { // Matches Zod schema structure
        param1: { type: z.string(), description: "Description for parameter 1" },
      };

      async execute(args: MyToolInput): Promise<any> {
        console.error(`Handling tool request: ${this.name}`);
        const duckDBConn = getDuckDBConnection(); // Get dependency
        // ... implement logic using args and duckDBConn ...
        const result = { message: `Processed ${args.param1}` };
        return formatSuccessResponse(result);
      }
    }
    export default MyTool; // Ensure default export
    ```

2. **Automatic Discovery:**
    - `mcp-framework` automatically discovers and registers tool/resource classes that are default-exported from files within the `src/tools` and `src/resources` directories.
    - Ensure your new class is the `default export` in its file.

3. **Test:**
    - Run the server (`make dev`).
    - Check the startup logs to ensure your new tool/resource is listed.
    - Use an MCP client (like `mcp-cli` or the MCP Inspector) to call the tool or read the resource and verify its functionality.

### Best Practices

- Define clear input schemas using Zod for tools.
- Handle errors gracefully within `execute`/`read` and return formatted error responses using `formatErrorResponse` (or throw errors).
- Use the centralized configuration (`src/config.ts`) via `getConfig()` where needed.
- Leverage the service initializers in `src/services/` for dependencies like database connections.
- Add logging (`console.error`) for visibility.
