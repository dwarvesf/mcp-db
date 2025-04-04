import { MCPTool } from "mcp-framework";
import { z } from "zod";
import pkg from 'duckdb';
const duckdb = pkg;
import { formatSuccessResponse, formatErrorResponse } from '../utils.js';
import { setupDuckDB, POSTGRES_DB_ALIAS } from '../services/duckdb.js'; // Import the alias

// Define the input schema using Zod - simplified
const PostgresQueryInputSchema = z.object({
  query: z.string().describe("SQL query to execute on the PostgreSQL database configured via setupDuckDB. A LIMIT clause is recommended."),
});

// Infer the input type from the Zod schema
type PostgresQueryInput = z.infer<typeof PostgresQueryInputSchema>;
type DuckDBConnection = InstanceType<typeof duckdb.Connection>;

export class DuckDBQueryTool extends MCPTool<PostgresQueryInput> {
  name = "duckdb_query";
  // Use the imported alias in the description
  description = `Executes a read-only SQL query directly on the attached PostgreSQL database ('${POSTGRES_DB_ALIAS}') using DuckDB. Automatically prefixes unqualified table names with '${POSTGRES_DB_ALIAS}.public.'.`;

  // Define schema matching the structure - simplified
  schema = {
    query: {
      type: z.string(),
      // Use the imported alias in the description
      description: `SQL query to execute directly on the attached PostgreSQL database ('${POSTGRES_DB_ALIAS}'). Example: 'SELECT * FROM my_table LIMIT 10'`,
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

      // Prefix unqualified table names (simple approach)
      const pgPrefix = `${POSTGRES_DB_ALIAS}.public.`; // Use the imported alias
      // Regex to find FROM/JOIN followed by an unqualified table name
      // Looks for FROM/JOIN, whitespace, then an identifier (letters, numbers, _)
      // that is NOT followed by a dot (.), indicating it's unqualified.
      // Using \b for word boundaries to avoid partial matches.
      const modifiedQuery = args.query.replace(
        /\b(FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b(?!\.)/gi,
        (match, keyword, tableName) => {
          console.error(`Prefixing table name: ${tableName} -> ${pgPrefix}${tableName}`);
          return `${keyword} ${pgPrefix}${tableName}`;
        }
      );

      console.error(`Executing modified query: ${modifiedQuery}`);
      // Execute the modified query directly
      const result = await new Promise((resolve, reject) => {
        // No need to specify alias if DuckDB handles it implicitly
        duckDBConn!.all(modifiedQuery, (err, result) => { // Use modifiedQuery
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
      // throw new Error(`Postgres Query Tool Error: ${error instanceof Error ? error.message : String(error)}`);
      return formatErrorResponse(error);
    }
    // No finally block for DETACH needed as per user feedback
  }
}

export default DuckDBQueryTool;
