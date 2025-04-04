import { MCPTool } from "mcp-framework";
import { z } from "zod";
import pkg from 'duckdb';
const duckdb = pkg;
import { formatSuccessResponse, serializeBigInt } from '../utils.js';
import { setupDuckDB } from '../services/duckdb.js';

// Define the input schema using Zod - simplified
const PostgresQueryInputSchema = z.object({
  query: z.string().describe("SQL query to execute on the PostgreSQL database configured via setupDuckDB. A LIMIT clause is recommended."),
});

// Infer the input type from the Zod schema
type PostgresQueryInput = z.infer<typeof PostgresQueryInputSchema>;
type DuckDBConnection = InstanceType<typeof duckdb.Connection>;

export class DuckDBQueryTool extends MCPTool<PostgresQueryInput> {
  name = "duckdb_query";
  description = `Query data from a PostgreSQL database via DuckDB. Assumes connection is fully managed by setupDuckDB (limited to 1000 rows by default).`;

  // Define schema matching the structure - simplified
  schema = {
    query: {
      type: z.string(),
      description: `SQL query to execute on the PostgreSQL database configured via setupDuckDB. A LIMIT clause is recommended.`,
    },
  };

  // Implement the execution logic
  async execute(args: PostgresQueryInput): Promise<any> {
    console.error(`Handling tool request: ${this.name}`);
    let duckDBConn: DuckDBConnection | null = null;

    try {
      // Initialize DuckDB connection (assuming it handles all postgres setup)
      duckDBConn = await setupDuckDB();
      console.error(`DuckDB connection obtained. Assuming PostgreSQL connection is ready.`);

      // // Prepare the query, handling potential trailing semicolon and adding LIMIT
      // let baseQuery = args.query.trim();
      // const endsWithSemicolon = baseQuery.endsWith(';');
      // if (endsWithSemicolon) {
      //   baseQuery = baseQuery.slice(0, -1).trim(); // Remove trailing semicolon
      // }

      // let finalQuery: string;
      // const isSelectQuery = baseQuery.toUpperCase().startsWith('SELECT');
      // const hasLimit = baseQuery.toUpperCase().includes('LIMIT');

      // // Add LIMIT only to SELECT queries that don't already have one
      // if (isSelectQuery && !hasLimit) {
      //   finalQuery = `${baseQuery} LIMIT 1000`;
      //   console.error("Automatically added LIMIT 1000 to SELECT query.");
      // } else {
      //   finalQuery = baseQuery; // Use the original query (minus trailing semicolon)
      //   if (!isSelectQuery) {
      //     console.error("Query is not a SELECT statement, LIMIT not added.");
      //   } else if (hasLimit) {
      //     console.error("Query already contains LIMIT, not adding automatically.");
      //   }
      // }
      // Note: We are intentionally not adding the semicolon back. DuckDB usually handles this fine.

      console.error(`Executing query: ${args.query}`);
      // Execute the query directly
      const result = await new Promise((resolve, reject) => {
        // No need to specify alias if DuckDB handles it implicitly
        duckDBConn!.all(args.query, (err, result) => { // Use finalQuery
          if (err) {
            console.error("PostgreSQL query execution error:", err);
            reject(err);
          } else {
            console.error(`PostgreSQL query executed successfully`);
            resolve(result);
          }
        });
      });

      // Format the result according to the expected structure
      return formatSuccessResponse(result);
    } catch (error) {
      console.error(`Error executing ${this.name}:`, error);
      // Provide a generic error message as specific alias errors are less likely now
      throw new Error(`Postgres Query Tool Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    // No finally block for DETACH needed as per user feedback
  }
}

export default DuckDBQueryTool;
