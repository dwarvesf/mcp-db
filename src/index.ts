#!/usr/bin/env node
import { MCPServer } from "mcp-framework"; // Use the correct import based on user feedback
// Assuming McpError and ErrorCode might not be exported or needed in the same way.
// If errors occur, we might need to adjust handler error throwing.
// import { McpError, ErrorCode } from "mcp-framework";
import arg from 'arg';
import { Pool } from 'pg';
import pkg from 'duckdb';
const duckdb = pkg;
import { Storage } from '@google-cloud/storage';

import { setupPostgres } from './services/postgres.js';
import { setupDuckDB } from './services/duckdb.js';
import { setupGCS } from './services/gcs.js';
import { validateConfig } from './config.js';

type DuckDBConnection = InstanceType<typeof duckdb.Connection>;

// --- Argument Parsing and Help/Version ---
const args = arg({
  '--log-level': String,
  '--gcs-bucket': String,
  '--help': Boolean,
  '-h': '--help',
  '--version': Boolean,
  '-v': '--version',
  '--no-color': Boolean,
  '--transport': String, // 'stdio' or 'sse' (maps to 'http-stream')
  '--port': Number,
  '--host': String,
});

if (!args['--no-color']) {
  process.env.FORCE_COLOR = '1';
}

if (args['--version']) {
  // Assuming package.json version is still relevant
  console.log(`mcp-db v${process.env.npm_package_version || '1.0.0'} (using mcp-framework)`);
  process.exit(0);
}

if (args['--help']) {
  console.log(`
  mcp-db - MCP server for database and parquet file operations (using mcp-framework)

  Usage:
    npx github:dwarvesf/mcp-db [options]

  Options:
    --log-level=LEVEL     Set the logging level (debug, info, error)
    --gcs-bucket=BUCKET   Specify the Google Cloud Storage bucket
    --no-color           Disable colored output
    --transport=TYPE     Transport type (stdio or sse) (default: stdio)
    --port=PORT         HTTP server port (default: 3001, used for sse)
    --host=HOST         HTTP server host (default: localhost, used for sse)
    -v, --version         Show version information
    -h, --help            Show this help message

  Environment Variables:
    DATABASE_URL          PostgreSQL connection string (required)
    LOG_LEVEL            Logging level (default: info)
    GCP_SERVICE_ACCOUNT  Base64 encoded GCP service account key (optional)
    GCS_BUCKET           Default GCS bucket name (optional)

  Example:
    export DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
    npx github:dwarvesf/mcp-db --gcs-bucket my-bucket --transport sse --port 8080
  `);
  process.exit(0);
}

// --- Main Server Logic ---
export async function main(): Promise<void> {
  let pgPool: Pool | null = null;
  let duckDBConn: DuckDBConnection | null = null;
  let gcs: Storage | null = null;
  let server: MCPServer | null = null; // Define server variable

  try {
    console.error("\nStarting Data Query MCP Server (using mcp-framework)...");

    // Validate configuration
    console.error("Validating configuration...");
    const config = validateConfig(args);
    console.error("Configuration validated successfully");

    // Setup PostgreSQL
    if (config.databaseUrl) {
      console.error("\nSetting up PostgreSQL connection...");
      pgPool = await setupPostgres(config.databaseUrl);
      console.error("PostgreSQL connection established successfully");
    }

    // Setup DuckDB
    console.error("\nSetting up DuckDB...");
    duckDBConn = await setupDuckDB();
    console.error("DuckDB setup completed successfully");

    // Setup GCS
    console.error("\nSetting up Google Cloud Storage...");
    gcs = await setupGCS();
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

    // --- Configure Transport ---
    let transportConfig: any;
    const port = args['--port'] || 3001;
    const host = args['--host'] || 'localhost';
    console.error(`\nConfiguring server for SSE (http-stream) transport on ${host}:${port}...`);
    // Map 'sse' arg to 'http-stream' type and configure options
    transportConfig = {
      type: "sse", // Based on example
      options: {
        port: port,
        host: host,
        endpoint: "/sse", // Default or make configurable
        // Add other relevant options from example if needed (cors, auth, etc.)
        cors: { // Basic CORS for broad compatibility
          allowOrigin: "*",
          allowMethods: "GET, POST, DELETE, OPTIONS",
          allowHeaders: "Content-Type, Accept, Authorization, x-api-key, Mcp-Session-Id, Last-Event-ID",
          exposeHeaders: "Content-Type, Authorization, x-api-key, Mcp-Session-Id",
          maxAge: "86400"
        },
      }
    };

    // --- Create and Start Server ---
    console.error("\nCreating MCP server instance...");
    server = new MCPServer({
      // Tools/Resources/Capabilities are not constructor args. Registration likely happens via methods.
      transport: transportConfig,
      // Add logger configuration if needed
      // logger: console,
    });
    console.error("Server instance created");
    console.error("Starting server...");
    await server.start(); // Use the start method from the example
    console.error("\nServer is running and listening for requests");
    console.error("Press Ctrl+C to stop the server\n");


    // --- Graceful Shutdown ---
    const cleanup = async () => {
      console.error("\nShutting down server...");
      if (server && typeof server.stop === 'function') {
        await server.stop(); // Assuming a stop method exists
        console.error("MCP Server stopped");
      } else {
         console.error("MCP Server instance not found or stop method unavailable.");
      }
      if (pgPool) {
        await pgPool.end();
        console.error("PostgreSQL connection closed");
      }
      // Add DuckDB cleanup if needed
      // if (duckDBConn) { ... }
      console.error("Cleanup complete");
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Keep the process running (especially for stdio)
    // The server.start() might handle this, but this ensures it stays alive
    // process.stdin.resume(); // May not be needed if server.start() blocks

  } catch (error: unknown) {
    console.error("\nFatal error during server lifecycle:");
    if (error instanceof Error) {
      console.error("Message:", error.message);
      if (error.stack) {
        console.error("Stack trace:");
        console.error(error.stack);
      }
    } else {
      console.error("Unknown error:", error);
    }
    // Ensure cleanup runs even on startup error
    if (pgPool) await pgPool.end().catch(e => console.error("Error closing PG pool on startup failure:", e));
    // Attempt server stop if it was initialized
    if (server && typeof server.stop === 'function') await server.stop().catch(e => console.error("Error stopping server on startup failure:", e));
    process.exit(1);
  }
}

// Execute main function
main();
