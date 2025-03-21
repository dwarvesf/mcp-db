import { Pool } from 'pg';
import pkg from 'duckdb';
const duckdb = pkg;
import { formatErrorResponse, formatSuccessResponse } from './utils.js';
import { SQLQueryArgs, DuckDBQueryArgs } from './types.js';
import { handleDuckDBQuery } from './tools/duckdb/handler.js';
import { handlePostgreSQLQuery } from './tools/sql/handler.js';

type DuckDBConnection = InstanceType<typeof duckdb.Connection>;

export function createToolHandlers(pgPool: Pool | null, duckDBConn: DuckDBConnection | null) {
  return async (request: any) => {
    console.error(`Received tool request: ${request.params.name}`);

    try {
      switch (request.params.name) {
        case "duckdb_read_parquet_files": {
          if (!duckDBConn) {
            throw new Error("DuckDB connection not initialized");
          }
          const result = await handleDuckDBQuery(
            duckDBConn,
            request.params.arguments as DuckDBQueryArgs
          );
          return formatSuccessResponse(result);
        }

        case "sql_query_create":
        case "sql_query_read":
        case "sql_query_update":
        case "sql_query_delete": {
          if (!pgPool) {
            throw new Error("PostgreSQL connection not initialized");
          }
          const args = request.params.arguments as SQLQueryArgs;
          if (!args.sql) {
            throw new Error("SQL query is required");
          }
          const result = await handlePostgreSQLQuery(
            pgPool,
            args.sql,
            args.params
          );
          return formatSuccessResponse(result.rows);
        }

        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    } catch (error) {
      return formatErrorResponse(error);
    }
  };
} 