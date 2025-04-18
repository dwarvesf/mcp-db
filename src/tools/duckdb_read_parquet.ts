import { MCPTool, logger } from "mcp-framework";
import { z } from "zod";
import pkg from 'duckdb';
const duckdb = pkg;
import { formatErrorResponse, formatSuccessResponse, serializeBigInt } from '../utils.js';
import { setupDuckDB } from '../services/duckdb.js';

// Remove separate Zod schema definition and type inference

type DuckDBConnection = InstanceType<typeof duckdb.Connection>;

// Use default generic type for MCPTool.
// The actual input type for execute will be validated by the base class using the 'schema' property below.
export class DuckDBReadParquetTool extends MCPTool {
  name = "duckdb_read_parquet";
  description = "Query Parquet files from HTTPS links or GCS (automatically limited to 1000 rows by default)";

  // Define schema matching the structure from the WeatherTool example
  schema = {
    query: {
      type: z.string(),
      description: "SQL query to execute on Parquet files. A LIMIT clause will be automatically added if not present.",
    },
  };

  // Implement the execution logic
  // The 'args' type will be validated by the base MCPTool class against the 'schema' property.
  async execute(args: { query: string }): Promise<any> {
    logger.info(`Handling tool request: ${this.name}`);
    let duckDBConn: DuckDBConnection | null = null;

    try {
      // Initialize DuckDB connection
      duckDBConn = await setupDuckDB();

      // Execute the query directly using the all method
      const result = await new Promise((resolve, reject) => {
        duckDBConn!.all(args.query, (err, result) => {
          if (err) {
            logger.error(`DuckDB query execution error: ${err}`);
            reject(err);
          } else {
            logger.info(`DuckDB query executed successfully`);
            resolve(result);
          }
        });
      });

      // Format the result according to the expected structure
      return formatSuccessResponse(result);
    } catch (error) {
      logger.error(`Error executing ${this.name}: ${error}`);
      return formatErrorResponse(error);
    }
  }
}

export default DuckDBReadParquetTool;
