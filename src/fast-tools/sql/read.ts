import { z } from 'zod';
import { Pool } from 'pg';
import { handlePostgreSQLQuery } from '../../tools/sql/handler.js';
import { SQLQueryArgs } from '../../types.js';
import { FastMCPTool } from '../types.js';

export function createSqlQueryReadTool(pgPool: Pool | null): FastMCPTool<SQLQueryArgs> {
  return {
    name: "sql_query_read",
    description: "Execute SELECT queries on Postgres database (automatically limited to 1000 rows by default)",
    parameters: z.object({
      sql: z.string().describe("SQL query to execute. A LIMIT clause will be automatically added if not present."),
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