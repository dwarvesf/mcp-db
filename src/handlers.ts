import { Pool } from 'pg';
import pkg from 'duckdb';
const duckdb = pkg;
import { formatErrorResponse, formatSuccessResponse } from './utils.js';
import { SQLQueryArgs, DuckDBQueryArgs } from './types.js';
import { handleDuckDBQuery } from './tools/duckdb/handler.js';
import { handlePostgreSQLQuery } from './tools/sql/handler.js';
import { handleSQLTablesResource } from './resources/sql/handler.js';
import { handleGCSObjectsResource } from './resources/gcs/handler.js';
import { Storage } from '@google-cloud/storage';
import { ServerResult } from '@modelcontextprotocol/sdk/types.js';

type DuckDBConnection = InstanceType<typeof duckdb.Connection>;

interface ResourceRequest {
  params: {
    uri: string;
  };
}

interface Resource {
  uri: string;
  content: any;
}

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

export function createResourceHandlers(pgPool: Pool | null, gcs: Storage | null, gcsBucket: string | undefined) {
  return async (request: ResourceRequest): Promise<ServerResult> => {
    console.error(`Received resource request for ${request.params.uri}`);

    try {
      const uri = request.params.uri;
      
      // Handle postgres:// URIs
      if (uri.startsWith('postgres://')) {
        if (!pgPool) {
          throw new Error("PostgreSQL connection not initialized");
        }
        const result = await handleSQLTablesResource(pgPool);
        const resource = result.find((r: Resource) => r.uri === uri);
        if (!resource) {
          throw new Error(`Resource not found: ${uri}`);
        }
        return {
          contents: [{
            uri: resource.uri,
            text: JSON.stringify(resource.content, null, 2)
          }],
          tools: []
        };
      }

      // Handle gcs:// URIs
      if (uri.startsWith('gcs://')) {
        if (!gcs || !gcsBucket) {
          throw new Error("GCS not properly configured");
        }
        const result = await handleGCSObjectsResource(gcs, gcsBucket);
        const resource = result.find((r: Resource) => r.uri === uri);
        if (!resource) {
          throw new Error(`Resource not found: ${uri}`);
        }
        return {
          contents: [{
            uri: resource.uri,
            text: JSON.stringify(resource.content, null, 2)
          }],
          tools: []
        };
      }

      throw new Error(`Unknown resource URI scheme: ${uri}`);
    } catch (error) {
      return formatErrorResponse(error);
    }
  };
} 