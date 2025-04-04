import { MCPTool } from "mcp-framework";
import { z } from "zod";
import pkg from 'duckdb';
const duckdb = pkg;
import { setupDuckDB } from '../services/duckdb.js';
import { formatSuccessResponse, formatErrorResponse } from "../utils.js";

// Define the input schema using Zod
const PostgresInsertInputSchema = z.object({
  query: z.string().describe("SQL DML/DDL query (e.g., INSERT) to execute on the PostgreSQL database configured via setupDuckDB."),
});

// Infer the input type from the Zod schema
type PostgresInsertInput = z.infer<typeof PostgresInsertInputSchema>;
type DuckDBConnection = InstanceType<typeof duckdb.Connection>;

export class DuckDBInsertTool extends MCPTool<PostgresInsertInput> {
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
  async execute(args: PostgresInsertInput): Promise<any> {
    console.error(`Handling tool request: ${this.name}`);
    let duckDBConn: DuckDBConnection | null = null;

    try {
      // Initialize DuckDB connection (assuming it handles all postgres setup)
      duckDBConn = await setupDuckDB();
      console.error(`DuckDB connection obtained. Ready for INSERT.`);

      // Validate that the query is an INSERT statement
      const queryTrimmed = args.query.trim();
      if (!queryTrimmed.toUpperCase().startsWith('INSERT')) {
        // Throw specific error for invalid query type
        throw new Error("Invalid query type: Only INSERT statements are allowed by this tool.");
      }

      console.error(`Executing INSERT query: ${queryTrimmed}`);
      // Execute the INSERT query directly using exec
      await new Promise<void>((resolve, reject) => {
        duckDBConn!.exec(queryTrimmed, (err) => { // Use trimmed query
          if (err) {
            console.error("PostgreSQL INSERT execution error:", err);
            // Reject with a more specific error message
            reject(new Error(`Error executing INSERT: ${err.message}`));
          } else {
            console.error(`PostgreSQL DML/DDL query executed successfully`);
            resolve();
          }
        });
      });

      // Format the result according to the expected structure
      return formatSuccessResponse("Query executed successfully.");
    } catch (error) {
      console.error(`Error executing ${this.name}:`, error);
      return formatErrorResponse(error);
    }
    // No finally block needed
  }
}

export default DuckDBInsertTool;
