import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import arg from 'arg';
import { Pool } from 'pg';

import { setupPostgres } from './services/postgres.js';
import { setupDuckDB } from './services/duckdb.js';
import { setupGCS } from './services/gcs.js';
import { validateConfig } from './config.js';
import { tools } from './tools/index.js';
import { resources } from './resources/index.js';
import { createToolHandlers } from './handlers.js';
import { formatSuccessResponse, formatErrorResponse } from './utils.js';

// Command line argument parsing with validation
const args = arg({
  '--log-level': String,
});

// Initialize the MCP server with proper capabilities
const server = new Server({
  name: "Data-Query-Server",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {},
    resources: {}
  }
});

async function main() {
  try {
    console.error("Starting Data Query MCP Server...");

    // Validate configuration
    const config = validateConfig(args);

    // Setup PostgreSQL
    let pgPool: Pool | null = null;
    if (config.databaseUrl) {
      pgPool = await setupPostgres(config.databaseUrl);
    }

    // Setup DuckDB
    const duckDBConn = await setupDuckDB();
    console.error("DuckDB setup completed successfully");

    // Setup GCS
    const gcs = await setupGCS();
    if (gcs) {
      console.error("GCS setup completed successfully");
    }

    // Register tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.error("Received ListToolsRequest");
      return { tools };
    });

    // Register tool handlers
    server.setRequestHandler(CallToolRequestSchema, createToolHandlers(pgPool, duckDBConn));

    // Register resource handlers
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      console.error("Received ListResourcesRequest");
      return { resources };
    });

    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      console.error(`Received ReadResourceRequest for ${request.params.uri}`);
      
      if (!pgPool) {
        throw new Error("PostgreSQL connection not initialized");
      }

      try {
        switch (request.params.uri) {
          case "mcp://db/tables": {
            const result = await pgPool.query(`
              SELECT 
                table_schema as schema_name,
                table_name,
                json_agg(json_build_object(
                  'column_name', column_name,
                  'data_type', data_type,
                  'is_nullable', is_nullable = 'YES'
                )) as columns
              FROM information_schema.columns
              WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
              GROUP BY table_schema, table_name
              ORDER BY table_schema, table_name;
            `);
            return {
              contents: [{
                uri: request.params.uri,
                text: JSON.stringify(result.rows, null, 2)
              }]
            };
          }
          default:
            throw new Error(`Unknown resource URI: ${request.params.uri}`);
        }
      } catch (error) {
        return formatErrorResponse(error);
      }
    });

    // Start the server
    const transport = new StdioServerTransport();
    console.error("Connecting server to transport...");
    await server.connect(transport);

    console.error("Data Query MCP Server running on stdio");

    // Handle graceful shutdown
    const cleanup = async () => {
      console.error("Shutting down server...");
      if (pgPool) {
        await pgPool.end();
      }
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (error: unknown) {
    console.error("Fatal error in main():", error);
    process.exit(1);
  }
}

// Start the server
main().catch((error: unknown) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
