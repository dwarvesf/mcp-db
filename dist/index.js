#!/usr/bin/env node
import { MCPServer, logger } from "mcp-framework"; // Use the correct import based on user feedback
// Assuming McpError and ErrorCode might not be exported or needed in the same way.
// If errors occur, we might need to adjust handler error throwing.
// import { McpError, ErrorCode } from "mcp-framework";
import arg from 'arg';
import pkg from 'duckdb';
const duckdb = pkg;
import { setupPostgres } from './services/postgres.js';
import { setupDuckDB } from './services/duckdb.js';
import { setupGCS } from './services/gcs.js';
import { validateConfig } from './config.js';
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
export async function main() {
    let pgPool = null;
    let duckDBConn = null;
    let gcs = null;
    let server = null; // Define server variable
    try {
        logger.info("\nStarting Data Query MCP Server (using mcp-framework)...");
        // Validate configuration
        logger.info("Validating configuration...");
        const config = validateConfig(args);
        logger.info("Configuration validated successfully");
        // Setup PostgreSQL
        if (config.databaseUrl) {
            logger.info("\nSetting up PostgreSQL connection...");
            pgPool = await setupPostgres(config.databaseUrl);
            logger.info("PostgreSQL connection established successfully");
        }
        // Setup DuckDB
        logger.info("\nSetting up DuckDB...");
        duckDBConn = await setupDuckDB();
        logger.info("DuckDB setup completed successfully");
        // Setup GCS
        logger.info("\nSetting up Google Cloud Storage...");
        gcs = await setupGCS();
        if (gcs) {
            logger.info("GCS setup completed successfully");
            if (config.gcsBucket) {
                logger.info(`Using GCS bucket: ${config.gcsBucket}`);
            }
            else {
                logger.warn("Warning: No GCS bucket configured");
            }
        }
        else {
            logger.warn("Warning: GCS setup skipped (no credentials provided)");
        }
        // --- Configure Transport ---
        let transportConfig;
        const port = args['--port'] || 3001;
        const host = args['--host'] || '0.0.0.0';
        if (args['--transport'] === 'sse') {
            logger.info(`\nConfiguring server for SSE (http-stream) transport on ${host}:${port}...`);
            // Map 'sse' arg to 'http-stream' type and configure options
            transportConfig = {
                type: "sse", // Based on example
                options: {
                    port: port,
                    host: host,
                    // Add other relevant options from example if needed (cors, auth, etc.)
                    cors: {
                        allowOrigin: "*",
                        allowMethods: "GET, POST, DELETE, OPTIONS",
                        allowHeaders: "Content-Type, Accept, Authorization, x-api-key, Mcp-Session-Id, Last-Event-ID",
                        exposeHeaders: "Content-Type, Authorization, x-api-key, Mcp-Session-Id",
                        maxAge: "86400"
                    }
                }
            };
        }
        if (args['--transport'] === 'stdio') {
            transportConfig = {
                type: "stdio", // Based on example
                options: {
                // No additional options needed for stdio
                }
            };
        }
        // --- Create and Start Server ---
        logger.info("\nCreating MCP server instance...");
        server = new MCPServer({
            // Tools/Resources/Capabilities are not constructor args. Registration likely happens via methods.
            transport: transportConfig,
            // Add logger configuration if needed
            // logger: console,
        });
        logger.info("Server instance created");
        logger.info("Starting server...");
        await server.start(); // Use the start method from the example
        logger.info("\nServer is running and listening for requests");
        logger.info("Press Ctrl+C to stop the server\n");
        // --- Graceful Shutdown ---
        const cleanup = async () => {
            logger.info("\nShutting down server...");
            if (server && typeof server.stop === 'function') {
                await server.stop(); // Assuming a stop method exists
                logger.info("MCP Server stopped");
            }
            else {
                logger.info("MCP Server instance not found or stop method unavailable.");
            }
            if (pgPool) {
                await pgPool.end();
                logger.info("PostgreSQL connection closed");
            }
            // Add DuckDB cleanup if needed
            // if (duckDBConn) { ... }
            logger.info("Cleanup complete");
            process.exit(0);
        };
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        // Keep the process running (especially for stdio)
        // The server.start() might handle this, but this ensures it stays alive
        // process.stdin.resume(); // May not be needed if server.start() blocks
    }
    catch (error) {
        logger.info("\nFatal error during server lifecycle:");
        if (error instanceof Error) {
            logger.error(`Message: ${error.message}`);
            if (error.stack) {
                logger.info("Stack trace:");
                logger.info(error.stack);
            }
        }
        else {
            logger.error(`Unknown error: ${error}`);
        }
        // Ensure cleanup runs even on startup error
        if (pgPool)
            await pgPool.end().catch(e => logger.error(`Error closing PG pool on startup failure:  ${e}`));
        // Attempt server stop if it was initialized
        if (server && typeof server.stop === 'function')
            await server.stop().catch(e => logger.error(`Error stopping server on startup failure: ${e}`));
        process.exit(1);
    }
}
// Execute main function
main();
