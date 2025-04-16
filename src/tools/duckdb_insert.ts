import { MCPTool, logger } from "mcp-framework";
import { z } from "zod";
import pkg from 'duckdb';
const duckdb = pkg;
import { executeQueryWithRetry } from '../services/duckdb.js';

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

    try {
      // Validate that the query is an INSERT statement
      const queryTrimmed = args.query.trim();

      if (!queryTrimmed.toUpperCase().startsWith('INSERT')) {
        throw new Error("Invalid query type: Only INSERT statements are allowed by this tool.");
      }

      logger.info(`Executing INSERT query: ${queryTrimmed}`);

      // Use the new executeQueryWithRetry function
      await executeQueryWithRetry(queryTrimmed, async (conn) => {
        return new Promise<void>((resolve, reject) => {
          conn.exec(queryTrimmed, (err) => {
            if (err) {
              logger.error(`PostgreSQL INSERT execution error: ${err}`);
              reject(err);
            } else {
              logger.info(`PostgreSQL DML/DDL query executed successfully`);
              resolve();
            }
          });
        });
      });

      return {status:"success", message: "INSERT executed successfully"};
    } catch (error: any) {
      console.log(`Error executing ${this.name}: ${error?.error || error}`);
      return { status: "failed", message: error ? error.message : "Unknown error", query: args.query };
    }
  }
}

export default DuckDBInsertTool;
