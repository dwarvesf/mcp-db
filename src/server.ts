#!/usr/bin/env node
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
import { createToolHandlers, createResourceHandlers } from './handlers.js';
import { formatSuccessResponse, formatErrorResponse } from './utils.js';
import { handleGCSObjectsResource } from './resources/gcs/handler.js';

// Command line argument parsing with validation
const args = arg({
  '--log-level': String,
  '--gcs-bucket': String,
  '--help': Boolean,
  '-h': '--help',
  '--version': Boolean,
  '-v': '--version',
  '--no-color': Boolean,
});

// Enable colors by default
if (!args['--no-color']) {
  process.env.FORCE_COLOR = '1';
}

// Display version information
if (args['--version']) {
  console.log(`mcp-db v${process.env.npm_package_version || '1.0.0'}`);
  process.exit(0);
}

// Display help information
if (args['--help']) {
  console.log(`
  mcp-db - MCP server for database and parquet file operations

  Usage:
    npx github:dwarvesf/mcp-db [options]

  Options:
    --log-level=LEVEL     Set the logging level (debug, info, error)
    --gcs-bucket=BUCKET   Specify the Google Cloud Storage bucket
    --no-color           Disable colored output
    -v, --version         Show version information
    -h, --help            Show this help message

  Environment Variables:
    DATABASE_URL          PostgreSQL connection string (required)
    LOG_LEVEL            Logging level (default: info)
    GCP_SERVICE_ACCOUNT  Base64 encoded GCP service account key (optional)
    GCS_BUCKET           Default GCS bucket name (optional)

  Example:
    export DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
    npx github:dwarvesf/mcp-db --gcs-bucket my-bucket
  `);
  process.exit(0);
}

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

export async function main(): Promise<void> {
  try {
    console.error("\nStarting Data Query MCP Server...");

    // Validate configuration
    console.error("Validating configuration...");
    const config = validateConfig(args);
    console.error("Configuration validated successfully");

    // Setup PostgreSQL
    let pgPool: Pool | null = null;
    if (config.databaseUrl) {
      console.error("\nSetting up PostgreSQL connection...");
      pgPool = await setupPostgres(config.databaseUrl);
      console.error("PostgreSQL connection established successfully");
    }

    // Setup DuckDB
    console.error("\nSetting up DuckDB...");
    const duckDBConn = await setupDuckDB();
    console.error("DuckDB setup completed successfully");

    // Setup GCS
    console.error("\nSetting up Google Cloud Storage...");
    const gcs = await setupGCS();
    if (gcs) {
      console.error("GCS setup completed successfully");
      if (config.gcsBucket) {
        console.error(`Using GCS bucket: ${config.gcsBucket}`);
      } else {
        console.error("Warning: No GCS bucket configured");
      }
    } else {
      console.error("Warning: GCS setup skipped (no credentials provided)");
    }

    // Register handlers
    console.error("\nRegistering MCP handlers...");
    
    // Register tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.error("Received ListToolsRequest");
      return { tools };
    });

    // Register tool handlers
    server.setRequestHandler(CallToolRequestSchema, createToolHandlers(pgPool, duckDBConn));
    console.error(`Registered ${tools.length} tools`);

    // Register resource handlers
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      console.error("Received ListResourcesRequest");
      
      let allResources = [...resources];
      
      // Add GCS resources if GCS is configured
      if (gcs && config.gcsBucket) {
        try {
          const gcsResources = await handleGCSObjectsResource(gcs, config.gcsBucket);
          // Map GCS resources to MCP resource format
          const mcpGcsResources = gcsResources.map(r => ({
            uri: r.uri,
            name: r.name,
            description: r.description
          }));
          allResources = allResources.concat(mcpGcsResources);
        } catch (error) {
          console.error("Error fetching GCS resources:", error);
        }
      }

      return { resources: allResources };
    });

    server.setRequestHandler(ReadResourceRequestSchema, createResourceHandlers(pgPool, gcs, config.gcsBucket));
    console.error(`Registered ${resources.length} resources`);

    // Start the server
    console.error("\nStarting server on stdio transport...");
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error("\nServer is ready and listening for requests");
    console.error("Press Ctrl+C to stop the server\n");

    // Handle graceful shutdown
    const cleanup = async () => {
      console.error("\nShutting down server...");
      if (pgPool) {
        await pgPool.end();
        console.error("PostgreSQL connection closed");
      }
      console.error("Cleanup complete");
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Keep the process running
    process.stdin.resume();
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("\nFatal error:", error.message);
      if (error.stack) {
        console.error("\nStack trace:");
        console.error(error.stack);
      }
    } else {
      console.error("\nUnknown error:", error);
    }
    process.exit(1);
  }
}

// Start the server
main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error("\nFatal error:", error.message);
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
  } else {
    console.error("\nUnknown error:", error);
  }
  process.exit(1);
});
