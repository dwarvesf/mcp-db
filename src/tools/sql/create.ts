import { MCPTool } from "mcp-framework";
import { z } from "zod";
import { Pool, QueryResult } from 'pg';
import { serializeBigInt } from '../../utils.js'; // Adjust path as needed

// Define the input schema using Zod
const SQLQueryCreateInputSchema = z.object({
  sql: z.string().describe("SQL query to execute (CREATE, INSERT, etc.)"),
  params: z.array(z.any()).optional().describe("Query parameters"), // Use z.any() for flexibility
});

// Infer the input type from the Zod schema
type SQLQueryCreateInput = z.infer<typeof SQLQueryCreateInputSchema>;

export default class SQLQueryCreateTool extends MCPTool<SQLQueryCreateInput> { // Changed to export default
  name = "sql_query_create";
  description = "Execute CREATE or INSERT statements on Postgres database";

  // Define schema matching the structure from the WeatherTool example
  schema = {
    sql: {
      type: z.string(),
      description: "SQL query to execute (CREATE, INSERT, etc.)",
    },
    params: {
      type: z.array(z.any()).optional(), // Keep Zod types here
      description: "Query parameters",
    },
  };

  private pgPool: Pool;

  // Constructor to receive dependencies
  constructor(pgPool: Pool) {
    super(); // Call the base class constructor
    if (!pgPool) {
      throw new Error("PostgreSQL connection pool is required for SQLQueryCreateTool");
    }
    this.pgPool = pgPool;
  }

  // Implement the execution logic
  async execute(args: SQLQueryCreateInput): Promise<any> { // Return type might be adjusted based on framework needs
    console.error(`Handling tool request: ${this.name}`);
    // Input validation is automatically handled by the framework using the Zod schema

    try {
      const result: QueryResult = await this.pgPool.query(args.sql, args.params);
      // Return rowCount for CREATE/INSERT, or rows if they exist
      return serializeBigInt(result.rows || { rowCount: result.rowCount });
    } catch (error) {
      // Throw standard error, framework should handle it
      console.error(`Error executing ${this.name}:`, error);
      throw new Error(`SQL Create Tool Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
