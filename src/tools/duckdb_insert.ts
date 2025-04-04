import { MCPTool } from "mcp-framework";
import { z } from "zod";
import pkg from 'duckdb';
const duckdb = pkg;
import { setupDuckDB } from '../services/duckdb.js';

// Define the input schema using Zod
const PostgresInsertInputSchema = z.object({
  query: z.string().describe("SQL DML/DDL query (e.g., INSERT) to execute on the PostgreSQL database configured via setupDuckDB."),
});

// Infer the input type from the Zod schema
type PostgresInsertInput = z.infer<typeof PostgresInsertInputSchema>;
type DuckDBConnection = InstanceType<typeof duckdb.Connection>;

export class DuckDBInsertTool extends MCPTool<PostgresInsertInput> {
  name = "duckdb_insert";
  description = `Execute an INSERT, or other DML/DDL statement on a PostgreSQL database via DuckDB. Assumes connection is fully managed by setupDuckDB.`;

  // Define schema matching the structure
  schema = {
    query: {
      type: z.string(),
      description: `SQL DML/DDL query (e.g., INSERT) to execute on the PostgreSQL database configured via setupDuckDB.`,
    },
  };

  // Implement the execution logic
  async execute(args: PostgresInsertInput): Promise<any> {
    console.error(`Handling tool request: ${this.name}`);
    let duckDBConn: DuckDBConnection | null = null;

    try {
      // Initialize DuckDB connection (assuming it handles all postgres setup)
      duckDBConn = await setupDuckDB();
      console.error(`DuckDB connection obtained. Assuming PostgreSQL connection is ready for DML/DDL.`);

      // Execute the DML/DDL query directly using exec
      await new Promise<void>((resolve, reject) => {
        duckDBConn!.exec(args.query, (err) => {
          if (err) {
            console.error("PostgreSQL DML/DDL execution error:", err);
            reject(err);
          } else {
            console.error(`PostgreSQL DML/DDL query executed successfully`);
            resolve();
          }
        });
      });

      // Format the success result
      return {
        content: [{
          type: "text",
          text: "Query executed successfully."
        }]
      };
    } catch (error) {
      console.error(`Error executing ${this.name}:`, error);
      throw new Error(`Postgres Insert Tool Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    // No finally block needed
  }
}

export default DuckDBInsertTool;
