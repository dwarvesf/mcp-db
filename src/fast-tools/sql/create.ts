import { z } from 'zod';
import { Pool } from 'pg';
import { handlePostgreSQLQuery } from '../../legacy-tools/sql/handler.js';
import { SQLQueryArgs } from '../../types.js';
import { FastMCPTool } from '../types.js';

export function createSqlQueryCreateTool(pgPool: Pool | null): FastMCPTool<SQLQueryArgs> {
  return {
    name: "sql_query_create",
    description: "Execute INSERT queries on Postgres database",
    parameters: z.object({
      sql: z.string().describe("SQL query to execute (INSERT)."),
      params: z.array(z.string()).optional().describe("Query parameters")
    }),
    execute: async (args: SQLQueryArgs) => {
      if (!pgPool) {
        throw new Error("PostgreSQL connection not initialized");
      }
      const result = await handlePostgreSQLQuery(pgPool, args.sql, args.params);
      return JSON.stringify(result.rows);
    }
  };
} 