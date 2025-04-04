import { Pool } from 'pg';
import pkg from 'duckdb';
const duckdb = pkg;
import { formatErrorResponse, formatSuccessResponse } from './utils.js';
import { SQLQueryArgs, DuckDBQueryArgs, GCSDirectoryTreeArgs } from './types.js';
import { handleDuckDBQuery } from './legacy-tools/duckdb/handler.js';
import { handlePostgreSQLQuery } from './legacy-tools/sql/handler.js';
import { handleGCSDirectoryTree } from './legacy-tools/gcs/handler.js';
import { handleSQLTablesResource } from './legacy-resources/sql/handler.js';
import { handleGCSObjectsResource } from './legacy-resources/gcs/handler.js';
import { Storage } from '@google-cloud/storage';

type DuckDBConnection = InstanceType<typeof duckdb.Connection>;

export function createToolHandlers(pgPool: Pool | null, duckDBConn: DuckDBConnection | null, gcs: Storage | null, gcsBucket: string | undefined) {
  return async (request: any) => {
    console.error(`Received tool request: ${request.params.name}`);

    try {
      switch (request.params.name) {
        case "duckdb_read_parquet": {
          if (!duckDBConn) {
            throw new Error("DuckDB connection not initialized");
          }
          const result = await handleDuckDBQuery(
            duckDBConn,
            request.params.arguments as DuckDBQueryArgs
          );
          return formatSuccessResponse(result);
        }

        case "gcs_directory_tree": {
          if (!gcs || !gcsBucket) {
            throw new Error("GCS not properly configured");
          }
          const result = await handleGCSDirectoryTree(
            gcs,
            gcsBucket,
            request.params.arguments as GCSDirectoryTreeArgs
          );
          return formatSuccessResponse(result);
        }

        case "sql_query_create":
        case "sql_query_read": {
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

export function createResourceHandlers(pgPool: Pool | null, gcs: Storage | null, gcsBucket: string | undefined) {
  return async (request: any) => {
    console.error(`Received resource request for ${request.params.uri}`);

    try {
      switch (request.params.uri) {
        case "mcp://db/tables": {
          if (!pgPool) {
            throw new Error("PostgreSQL connection not initialized");
          }
          const result = await handleSQLTablesResource(pgPool);
          return {
            contents: [{
              uri: request.params.uri,
              text: JSON.stringify(result, null, 2)
            }]
          };
        }

        case "mcp://gcs/objects": {
          if (!gcs || !gcsBucket) {
            throw new Error("GCS not properly configured");
          }
          const result = await handleGCSObjectsResource(gcs, gcsBucket);
          return {
            contents: [{
              uri: request.params.uri,
              text: JSON.stringify(result, null, 2)
            }]
          };
        }

        default:
          throw new Error(`Unknown resource URI: ${request.params.uri}`);
      }
    } catch (error) {
      return formatErrorResponse(error);
    }
  };
} 