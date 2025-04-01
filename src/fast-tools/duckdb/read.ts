import { z } from 'zod';
import pkg from 'duckdb';
const duckdb = pkg;
import { handleDuckDBQuery } from '../../tools/duckdb/handler.js';
import { DuckDBQueryArgs } from '../../types.js';
import { FastMCPTool } from '../types.js';

type DuckDBConnection = InstanceType<typeof duckdb.Connection>;

export function createDuckDBReadTool(duckDBConn: DuckDBConnection | null): FastMCPTool<DuckDBQueryArgs> {
  return {
    name: "duckdb_read_parquet_files",
    description: "Query Parquet files with DuckDB SQL (supports complex nested data)",
    parameters: z.object({
      query: z.string().describe("SQL query to execute against Parquet files"),
      file_paths: z.array(z.string()).describe("Local paths to Parquet files")
    }),
    execute: async (args: DuckDBQueryArgs) => {
      if (!duckDBConn) {
        throw new Error("DuckDB connection not initialized");
      }
      const result = await handleDuckDBQuery(duckDBConn, args);
      return JSON.stringify(result);
    }
  };
} 