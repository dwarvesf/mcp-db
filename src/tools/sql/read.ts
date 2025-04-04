import { MCPTool } from "mcp-framework";
import { z } from "zod";
import { Pool, QueryResult } from 'pg';
import { serializeBigInt } from '../../utils.js'; // Adjust path as needed

// Define the input schema using Zod
const SQLQueryReadInputSchema = z.object({
  sql: z.string().describe("SQL query to execute (SELECT). A LIMIT clause will be automatically added if not present."),
  params: z.array(z.any()).optional().describe("Query parameters"),
});

// Infer the input type from the Zod schema
type SQLQueryReadInput = z.infer<typeof SQLQueryReadInputSchema>;

export default class SQLQueryReadTool extends MCPTool<SQLQueryReadInput> { // Changed to export default
  name = "sql_query_read";
  description = "Execute SELECT queries on Postgres database (automatically limited to 1000 rows by default)";

  // Define schema matching the structure from the WeatherTool example
  schema = {
    sql: {
      type: z.string(),
      description: "SQL query to execute (SELECT). A LIMIT clause will be automatically added if not present.",
    },
    params: {
      type: z.array(z.any()).optional(),
      description: "Query parameters",
    },
  };

  private pgPool: Pool;

  // Constructor to receive dependencies
  constructor(pgPool: Pool) {
    super();
    if (!pgPool) {
      throw new Error("PostgreSQL connection pool is required for SQLQueryReadTool");
    }
    this.pgPool = pgPool;
  }

  // Implement the execution logic
  async execute(args: SQLQueryReadInput): Promise<any> {
    console.error(`Handling tool request: ${this.name}`);

    try {
      // Note: The original handler logic for adding LIMIT is assumed to be within handlePostgreSQLQuery
      // If not, it should be added here or within that function.
      const result: QueryResult = await this.pgPool.query(args.sql, args.params);
      return serializeBigInt(result.rows);
    } catch (error) {
      console.error(`Error executing ${this.name}:`, error);
      throw new Error(`SQL Read Tool Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
