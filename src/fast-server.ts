#!/usr/bin/env node
import { FastMCP } from 'fastmcp';
import { Pool } from 'pg';
import pkg from 'duckdb';
const duckdb = pkg;
import { Storage } from '@google-cloud/storage';
import arg from 'arg';

import { setupPostgres } from './services/postgres.js';
import { setupDuckDB } from './services/duckdb.js';
import { setupGCS } from './services/gcs.js';
import { validateConfig } from './config.js';
import { createTools } from './fast-tools/index.js';
import { createResources } from './fast-resources/index.js';
import { FastMCPTool, FastMCPResource } from './fast-tools/types.js';
import { log, formatJsonForLog, wrapToolsWithLogging, wrapResourcesWithLogging } from './utils/index.js';

type DuckDBConnection = InstanceType<typeof duckdb.Connection>;

// Command line argument parsing with validation
const args = arg({
  '--log-level': String,
  '--gcs-bucket': String,
  '--help': Boolean,
  '-h': '--help',
  '--version': Boolean,
  '-v': '--version',
  '--no-color': Boolean,
  '--transport': String,
  '--port': Number,
  '--host': String,
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
    --no-color            Disable colored output
    --transport=TYPE      Transport type (stdio or sse) (default: stdio)
    --port=PORT           HTTP server port (default: 3001)
    --host=HOST           HTTP server host (default: localhost)
    -v, --version         Show version information
    -h, --help            Show this help message

  Environment Variables:
    DATABASE_URL          PostgreSQL connection string (required)
    LOG_LEVEL             Logging level (default: info)
    GCP_SERVICE_ACCOUNT   Base64 encoded GCP service account key (optional)
    GCS_BUCKET            Default GCS bucket name (optional)

  Example:
    export DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
    npx github:dwarvesf/mcp-db --gcs-bucket my-bucket
  `);
  process.exit(0);
}

export async function main(): Promise<void> {
  try {
    log("Starting Data Query MCP Server with FastMCP...");

    // Validate configuration
    log("Validating configuration...");
    const config = validateConfig(args);
    log("Configuration validated successfully");

    // Create the FastMCP server
    const server = new FastMCP({
      name: "Data-Query-Server",
      version: "1.0.0",
    });

    // Setup PostgreSQL
    let pgPool: Pool | null = null;
    if (config.databaseUrl) {
      log("Setting up PostgreSQL connection...");
      pgPool = await setupPostgres(config.databaseUrl);
      log("PostgreSQL connection established successfully");
    }

    // Setup DuckDB
    log("Setting up DuckDB...");
    const duckDBConn = await setupDuckDB();
    log("DuckDB setup completed successfully");

    // Setup GCS
    log("Setting up Google Cloud Storage...");
    const gcs = await setupGCS();
    if (gcs) {
      log("GCS setup completed successfully");
      if (config.gcsBucket) {
        log(`Using GCS bucket: ${config.gcsBucket}`);
      } else {
        log("Warning: No GCS bucket configured", true);
      }
    } else {
      log("Warning: GCS setup skipped (no credentials provided)", true);
    }

    // Register tools
    log("Registering MCP tools...");
    const tools: FastMCPTool[] = createTools(pgPool, duckDBConn, gcs, config.gcsBucket);
    
    // Wrap tools with logging
    const wrappedTools = wrapToolsWithLogging(tools);
    
    // Register the wrapped tools
    wrappedTools.forEach(tool => server.addTool(tool));
    log(`Registered ${tools.length} tools with logging enabled`);

    // Register resources
    log("Registering MCP resources...");
    const resources: FastMCPResource[] = createResources(pgPool, gcs, config.gcsBucket);
    
    // Wrap resources with logging
    const wrappedResources = wrapResourcesWithLogging(resources);
    
    // Register the wrapped resources
    wrappedResources.forEach(resource => server.addResource(resource));
    log(`Registered ${resources.length} resources with logging enabled`);

    // Start the server with the appropriate transport
    const transportType = args['--transport'] || 'stdio';
    
    // Declare keepAlive at a higher scope so it's accessible in the cleanup function
    let keepAlive: NodeJS.Timeout | null = null;
    
    if (transportType === 'sse') {
      log("Starting server with SSE transport...");
      await server.start({
        transportType: "sse",
        sse: {
          endpoint: "/sse",
          port: args['--port'] || 3001
        }
      });
      
      // For SSE mode, we need to keep the process running
      log(`Server is ready and listening for requests on port ${args['--port'] || 3001}`);
      log("Press Ctrl+C to stop the server");
      
      // Create an explicit interval to keep the event loop active
      keepAlive = setInterval(() => {
        // This keeps the Node.js process alive
      }, 60000);
      
      // Clean up the interval on exit
      process.on('exit', () => {
        if (keepAlive) clearInterval(keepAlive);
      });
    } else {
      log("Starting server with stdio transport...");
      await server.start({
        transportType: "stdio"
      });
      
      log("Server is ready and listening for requests");
      log("Press Ctrl+C to stop the server");
      
      // In stdio mode, we don't need to manually keep the process alive
      // as the stdin/stdout pipes keep it running
    }

    // Handle graceful shutdown
    const cleanup = async () => {
      log("Shutting down server...");
      
      // Clear the keep-alive interval if it exists
      if (transportType === 'sse' && keepAlive) {
        clearInterval(keepAlive);
        keepAlive = null;
      }
      
      if (pgPool) {
        await pgPool.end();
        log("PostgreSQL connection closed");
      }
      log("Cleanup complete");
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // For SSE mode, we might need to also handle pause/resume of stdin
    if (transportType === 'sse') {
      // Keep the process running
      process.stdin.resume();
      
      // Prevent unhandled exceptions from crashing the server
      process.on('uncaughtException', (error) => {
        log(`Uncaught exception: ${error instanceof Error ? error.message : String(error)}`, true);
      });
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      log("Fatal error:", true);
      log(error.message, true);
      if (error.stack) {
        log("Stack trace:", true);
        console.error(error.stack);
      }
    } else {
      log("Unknown error:", true);
      log(String(error), true);
    }
    
    // Log additional debugging information
    log(`Node.js version: ${process.version}`);
    log(`Environment: ${process.env.NODE_ENV || 'not set'}`);
    log("Command line arguments:");
    console.error(formatJsonForLog(process.argv));
    
    // Exit with error code
    process.exit(1);
  }
}

// Run the server if this script is executed directly
if (import.meta.url.includes(process.argv[1])) {
  main().catch(error => {
    log("Unhandled error in main():", true);
    log(String(error), true);
    process.exit(1);
  });
} 