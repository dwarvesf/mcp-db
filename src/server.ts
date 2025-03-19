import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, Tool, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import arg from 'arg';
import { z } from "zod";
import duckdb from 'duckdb';
import { Storage } from '@google-cloud/storage';
import { GoogleAuth } from 'google-auth-library';
import pkg from 'pg';
import type { Pool, QueryResult } from 'pg';
const { Pool: PgPool } = pkg;

// Helper function to safely serialize BigInt values
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }
  
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, serializeBigInt(value)])
    );
  }
  
  return obj;
}

// Command line argument parsing with validation
const args = arg({
  '--database-url': String,
  '--gcs-bucket': String,
  '--gcs-dirs': [String],
  '--parquet-links': [String],
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

// Initialize PostgreSQL pool
let pgPool: Pool | null = null;

async function setupPostgreSQL() {
  if (!args['--database-url']) {
    console.error("Database URL not provided, PostgreSQL operations will be disabled");
    return null;
  }

  try {
    console.error("Setting up PostgreSQL connection...");
    pgPool = new PgPool({
      connectionString: args['--database-url'],
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Test the connection
    const client = await pgPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.error("PostgreSQL connection established successfully");
    return pgPool;
  } catch (error) {
    console.error("Failed to connect to PostgreSQL:", error);
    return null;
  }
}

// Define tools
const sqlQueryCreateTool: Tool = {
  name: "sql_query_create",
  description: "Execute CREATE or INSERT statements on Postgres database",
  inputSchema: {
    type: "object",
    properties: {
      sql: {
        type: "string",
        description: "SQL query to execute",
      },
      params: {
        type: "array",
        description: "Query parameters",
        items: { type: "string" }
      }
    },
    required: ["sql"]
  }
};

const sqlQueryReadTool: Tool = {
  name: "sql_query_read",
  description: "Execute SELECT queries on Postgres database",
  inputSchema: {
    type: "object",
    properties: {
      sql: {
        type: "string",
        description: "SQL query to execute",
      },
      params: {
        type: "array",
        description: "Query parameters",
        items: { type: "string" }
      }
    },
    required: ["sql"]
  }
};

const sqlQueryUpdateTool: Tool = {
  name: "sql_query_update",
  description: "Execute UPDATE statements on Postgres database",
  inputSchema: {
    type: "object",
    properties: {
      sql: {
        type: "string",
        description: "SQL query to execute",
      },
      params: {
        type: "array",
        description: "Query parameters",
        items: { type: "string" }
      }
    },
    required: ["sql"]
  }
};

const sqlQueryDeleteTool: Tool = {
  name: "sql_query_delete",
  description: "Execute DELETE statements on Postgres database",
  inputSchema: {
    type: "object",
    properties: {
      sql: {
        type: "string",
        description: "SQL query to execute",
      },
      params: {
        type: "array",
        description: "Query parameters",
        items: { type: "string" }
      }
    },
    required: ["sql"]
  }
};

const duckDBReadTool: Tool = {
  name: "duckdb_read_parquet_files",
  description: "Query Parquet files from HTTPS links or GCS",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "SQL query to execute on Parquet files",
      }
    },
    required: ["query"]
  }
};

async function setupDuckDB() {
  console.error("Setting up DuckDB...");
  
  // Initialize database
  const db = await new Promise<duckdb.Database>((resolve, reject) => {
    const database = new duckdb.Database(':memory:', (err) => {
      if (err) {
        console.error("Failed to initialize DuckDB:", err);
        reject(err);
      } else {
        resolve(database);
      }
    });
  });

  // Create connection
  const conn = await new Promise<duckdb.Connection>((resolve, reject) => {
    const connection = new duckdb.Connection(db, (err) => {
      if (err) {
        console.error("Failed to create DuckDB connection:", err);
        reject(err);
      } else {
        resolve(connection);
      }
    });
  });
  
  // Enable required extensions
  await new Promise<void>((resolve, reject) => {
    conn.exec(`INSTALL httpfs;
               LOAD httpfs;
               INSTALL parquet;
               LOAD parquet;`, (err) => {
      if (err) {
        console.error("Failed to enable DuckDB extensions:", err);
        reject(err);
      } else {
        resolve();
      }
    });
  });

  return conn;
}

async function setupGCS() {
  if (!args['--gcs-bucket']) return null;

  // Initialize GCS client
  const storage = new Storage();
  
  // If service account is provided, use it
  if (process.env.GCP_SERVICE_ACCOUNT) {
    const credentials = JSON.parse(
      Buffer.from(process.env.GCP_SERVICE_ACCOUNT, 'base64').toString()
    );
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    storage.authClient = auth;
  }

  return storage;
}

async function executePostgreSQLQuery(sql: string, params: any[] = []): Promise<QueryResult> {
  if (!pgPool) {
    throw new Error("PostgreSQL connection not initialized");
  }

  try {
    const result = await pgPool.query(sql, params);
    return result;
  } catch (error) {
    console.error("PostgreSQL query error:", error);
    throw error;
  }
}

async function main() {
  try {
    console.error("Starting Data Query MCP Server...");

    // Setup PostgreSQL
    await setupPostgreSQL();

    // Setup DuckDB
    const conn = await setupDuckDB();
    console.error("DuckDB setup completed successfully");

    // Setup GCS if bucket is provided
    const gcs = await setupGCS();
    if (gcs) {
      console.error("GCS setup completed successfully");
    }

    // Register tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.error("Received ListToolsRequest");
      return {
        tools: [
          sqlQueryCreateTool,
          sqlQueryReadTool,
          sqlQueryUpdateTool,
          sqlQueryDeleteTool,
          duckDBReadTool
        ]
      };
    });

    // Register tool handlers
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      console.error(`Received tool request: ${request.params.name}`);

      switch (request.params.name) {
        case "duckdb_read_parquet_files": {
          const query = request.params.arguments?.query as string;
          if (!query) {
            throw new Error("Query parameter is required");
          }

          try {
            const result = await new Promise((resolve, reject) => {
              conn.all(query, (err, result) => {
                if (err) {
                  console.error("DuckDB query execution error:", err);
                  reject(err);
                } else {
                  resolve(result);
                }
              });
            });
            
            // Serialize BigInt values before JSON stringification
            const serializedResult = serializeBigInt(result);
            
            return {
              content: [{ 
                type: "text", 
                text: JSON.stringify(serializedResult, null, 2)
              }]
            };
          } catch (error: unknown) {
            console.error('DuckDB query error:', error);
            return {
              content: [{ 
                type: "text", 
                text: `Error executing DuckDB query: ${error instanceof Error ? error.message : String(error)}` 
              }],
              isError: true
            };
          }
        }

        case "sql_query_create":
        case "sql_query_read":
        case "sql_query_update":
        case "sql_query_delete": {
          if (!pgPool) {
            throw new Error("PostgreSQL connection not initialized");
          }

          const sql = request.params.arguments?.sql as string;
          const params = request.params.arguments?.params as any[];

          if (!sql) {
            throw new Error("SQL query is required");
          }

          try {
            const result = await executePostgreSQLQuery(sql, params);
            
            return {
              content: [{ 
                type: "text", 
                text: JSON.stringify(result.rows, null, 2)
              }]
            };
          } catch (error: unknown) {
            console.error('PostgreSQL query error:', error);
            return {
              content: [{ 
                type: "text", 
                text: `Error executing PostgreSQL query: ${error instanceof Error ? error.message : String(error)}` 
              }],
              isError: true
            };
          }
        }

        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
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
    if (pgPool) {
      await pgPool.end();
    }
    process.exit(1);
  }
}

// Start the server
main().catch((error: unknown) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
}); 