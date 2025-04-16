import { MCPTool, logger } from "mcp-framework";
import { z } from "zod";
import { Pool } from 'pg';
import { setupPostgres } from '../services/postgres.js';
import { getConfig } from '../config.js';
import { formatSuccessResponse, formatErrorResponse } from "../utils.js";

// Use default generic type for MCPTool or a simpler one if needed.
// The actual input type for execute will be validated by the base class using the 'schema' property below.
export class SQLInsertTool extends MCPTool {
  name = "sql_insert";
  description = `Executes an INSERT statement on the PostgreSQL database. Only INSERT queries are allowed.`;
  private pool: Pool | null = null;

  // Define schema matching the structure
  schema = {
    query: {
      type: z.string(),
      description: `SQL INSERT query to execute on the PostgreSQL database. Must start with 'INSERT'.`,
    },
  };

  // Initialize PostgreSQL connection pool
  private async getPool(): Promise<Pool> {
    if (this.pool) {
      return this.pool;
    }

    // Get database connection from config
    const config = getConfig();
    let databaseUrl = config?.databaseUrl;
    
    // If not available, fall back to environment variable
    if (!databaseUrl) {
      databaseUrl = process.env.DATABASE_URL;
    }

    if (!databaseUrl) {
      throw new Error("No database URL configured. Please set DATABASE_URL environment variable or configure it in the app config.");
    }

    this.pool = await setupPostgres(databaseUrl);
    return this.pool;
  }

  // Implement the execution logic
  // The 'args' type will be validated by the base MCPTool class against the 'schema' property.
  async execute(args: { query: string }): Promise<any> {
    logger.info(`Handling tool request: ${this.name}`);

    try {
      // Validate that the query is an INSERT statement
      const queryTrimmed = args.query.trim();

      if (!queryTrimmed.toUpperCase().startsWith('INSERT')) {
        throw new Error("Invalid query type: Only INSERT statements are allowed by this tool.");
      }

      logger.info(`Executing INSERT query: ${queryTrimmed}`);

      // Get PostgreSQL connection pool
      const pool = await this.getPool();
      
      // Execute the query
      await pool.query(queryTrimmed);
      
      logger.info(`PostgreSQL INSERT query executed successfully`);
      return { status: "success", message: "INSERT executed successfully" };
    } catch (error: any) {
      logger.error(`Error executing ${this.name}: ${error?.message || error}`);
      return { status: "failed", message: error ? error.message : "Unknown error", query: args.query };
    }
  }
}

export default SQLInsertTool;
