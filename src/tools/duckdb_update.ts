import { MCPTool, logger } from "mcp-framework";
import { z } from "zod";
import pkg from 'duckdb';
const duckdb = pkg;
import { setupDuckDB } from '../services/duckdb.js';
import { formatSuccessResponse, formatErrorResponse } from "../utils.js";

type DuckDBConnection = InstanceType<typeof duckdb.Connection>;

// Remove separate Zod schema definition and type inference

// Use default generic type for MCPTool or a simpler one if needed.
// The actual input type for execute will be validated by the base class using the 'schema' property below.
export class DuckDBUpdateTool extends MCPTool {
  name = "duckdb_update";
  description = `Executes an UPDATE statement on the attached PostgreSQL database via DuckDB. Only UPDATE queries are allowed.`;

  // Define schema matching the structure
  schema = {
    query: {
      type: z.string(),
      description: `SQL UPDATE query to execute on the attached PostgreSQL database. Must start with 'UPDATE'.`,
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
      logger.info(`DuckDB connection obtained. Ready for UPDATE.`);

      // Validate that the query is an UPDATE statement
      const queryTrimmed = args.query.trim();

      if (!queryTrimmed.toUpperCase().startsWith('UPDATE')) {
        throw new Error("Invalid query type: Only UPDATE statements are allowed by this tool.");
      }

      // Initialize DuckDB connection
      duckDBConn = await setupDuckDB();
      logger.info(`DuckDB connection obtained. Ready for UPDATE on reader_tracker.`);

      logger.info(`Executing UPDATE query: ${queryTrimmed}`);
      // Execute the UPDATE query directly using exec
      await new Promise<void>((resolve, reject) => {
        duckDBConn!.exec(queryTrimmed, (err) => { // Use trimmed query
          if (err) {
            logger.error(`PostgreSQL UPDATE execution error: ${err}`);
            // Reject with a more specific error message
            reject(err);
          } else {
            logger.info(`PostgreSQL DML/DDL query executed successfully`);
            resolve();
          }
        });
      });

      // Format the result according to the expected structure
      return { status: "success", message: "UPDATE executed successfully" };
    } catch (error) {
      logger.error(`Error executing ${this.name}`);
      return { status: "failed", message: error instanceof Error ? error.message : String(error), query: args.query };
    }
    // No finally block needed
  }
}

export default DuckDBUpdateTool;
