import { MCPTool, logger } from "mcp-framework";
import { z } from "zod";
import pkg from 'duckdb';
const duckdb = pkg;
import { setupDuckDB } from '../services/duckdb.js';
import { formatSuccessResponse, formatErrorResponse } from "../utils.js";

// Remove separate Zod schema definition and type inference

type DuckDBConnection = InstanceType<typeof duckdb.Connection>;

// Use default generic type for MCPTool or a simpler one if needed.
// The actual input type for execute will be validated by the base class using the 'schema' property below.
export class DuckDBInsertTool extends MCPTool {
  name = "duckdb_insert";
  description = `Executes an INSERT statement on the attached PostgreSQL database via DuckDB. Only INSERT queries are allowed.`;

  // Define schema matching the structure
  schema = {
    query: {
      type: z.string(),
      description: `SQL INSERT query to execute on the attached PostgreSQL database. Must start with 'INSERT'.`,
    },
  };

  // Implement the execution logic
  // The 'args' type will be validated by the base MCPTool class against the 'schema' property.
  // We can use Record<string, any> or a more specific type if known, but validation happens before this.
  async execute(args: { query: string }): Promise<any> {
    logger.info(`Handling tool request: ${this.name}`);
    let duckDBConn: DuckDBConnection | null = null;

    try {
      // Initialize DuckDB connection (assuming it handles all postgres setup)
      duckDBConn = await setupDuckDB();
      logger.info(`DuckDB connection obtained. Ready for INSERT.`);

      // Validate that the query is an INSERT statement
      const queryTrimmed = args.query.trim();

      if (!queryTrimmed.toUpperCase().startsWith('INSERT')) {
        // Throw specific error for invalid query type
        throw new Error("Invalid query type: Only INSERT statements are allowed by this tool.");
      }

      logger.info(`Executing INSERT query: ${queryTrimmed}`);
      // Execute the INSERT query directly using exec
      await new Promise<void>((resolve, reject) => {
        duckDBConn!.exec(queryTrimmed, (err) => { // Use trimmed query
          if (err) {
            logger.error(`PostgreSQL INSERT execution error: ${err}`);
            // Reject with a more specific error message
            reject(err);
          } else {
            logger.info(`PostgreSQL DML/DDL query executed successfully`);
            resolve();
          }
        });
      });

      // Format the result according to the expected structure
      return {status:"success", message: "INSERT executed successfully"};
    } catch (error: any) {
      console.log(`Error executing ${this.name}: ${error?.error || error}`);
      return { status: "failed", message: error ? error.message : "Unknown error", query: args.query };
    }
    // No finally block needed
  }
}

export default DuckDBInsertTool;
