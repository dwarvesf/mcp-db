import { MCPTool,logger } from "mcp-framework";
import { z } from "zod";
import pkg from 'duckdb';
const duckdb = pkg;
import { formatSuccessResponse, formatErrorResponse } from '../utils.js';
import { setupDuckDB, POSTGRES_DB_ALIAS } from '../services/duckdb.js'; // Import the alias

// Remove separate Zod schema definition and type inference

type DuckDBConnection = InstanceType<typeof duckdb.Connection>;

// Use default generic type for MCPTool.
// The actual input type for execute will be validated by the base class using the 'schema' property below.
export class DuckDBQueryTool extends MCPTool {
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
  // The 'args' type will be validated by the base MCPTool class against the 'schema' property.
  async execute(args: { query: string }): Promise<any> {
    logger.info(`Handling tool request: ${this.name}`);
    let duckDBConn: DuckDBConnection | null = null;

    try {
      // Initialize DuckDB connection (assuming it handles all postgres setup)
      duckDBConn = await setupDuckDB();
      logger.info(`DuckDB connection obtained. Assuming PostgreSQL connection is ready.`);

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
      //   logger.info("Automatically added LIMIT 1000 to SELECT query.");
      // } else {
      //   finalQuery = baseQuery; // Use the original query (minus trailing semicolon)
      //   if (!isSelectQuery) {
      //     logger.info("Query is not a SELECT statement, LIMIT not added.");
      //   } else if (hasLimit) {
      //     logger.info("Query already contains LIMIT, not adding automatically.");
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
          logger.info(`Prefixing table name: ${tableName} -> ${pgPrefix}${tableName}`);
          return `${keyword} ${pgPrefix}${tableName}`;
        }
      );

      logger.info(`Executing modified query: ${modifiedQuery}`);
      // Execute the modified query directly
      const result = await new Promise((resolve, reject) => {
        // No need to specify alias if DuckDB handles it implicitly
        duckDBConn!.all(modifiedQuery, (err, result) => { // Use modifiedQuery
          if (err) {
            logger.error(`PostgreSQL query execution error: ${err}`);
            reject(err);
          } else {
            logger.info(`PostgreSQL query executed successfully`);
            resolve(result);
          }
        });
      });

      // Format the result according to the expected structure
      return formatSuccessResponse(result);
    } catch (error) {
      logger.error(`Error executing ${this.name}: ${error}`);
      // Provide a generic error message as specific alias errors are less likely now
      // throw new Error(`Postgres Query Tool Error: ${error instanceof Error ? error.message : String(error)}`);
      return formatErrorResponse(error);
    }
    // No finally block for DETACH needed as per user feedback
  }
}

export default DuckDBQueryTool;
