import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import arg from 'arg';
import { setupPostgres } from './services/postgres.js';
import { setupDuckDB } from './services/duckdb.js';
import { setupGCS } from './services/gcs.js';
import { validateConfig } from './config.js';
import { tools } from './tools/index.js';
import { resources } from './resources/index.js';
import { createToolHandlers, createResourceHandlers } from './handlers.js';
// Command line argument parsing with validation
const args = arg({
    '--log-level': String,
    '--gcs-bucket': String,
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
export async function main() {
    try {
        console.error("Starting Data Query MCP Server...");
        // Validate configuration
        const config = validateConfig(args);
        // Setup PostgreSQL
        let pgPool = null;
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
        server.setRequestHandler(ReadResourceRequestSchema, createResourceHandlers(pgPool, gcs, config.gcsBucket));
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
    }
    catch (error) {
        console.error("Fatal error in main():", error);
        process.exit(1);
    }
}
