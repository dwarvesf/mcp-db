import { Pool } from 'pg';
import { handleSQLTablesResource } from '../../resources/sql/handler.js';
import { FastMCPResource } from '../../fast-tools/types.js';

export function createSQLTablesResource(pgPool: Pool | null): FastMCPResource {
  return {
    name: "mcp://db/tables",
    description: "List of available tables in the PostgreSQL database",
    uri: "mcp://db/tables",
    load: async () => {
      if (!pgPool) {
        throw new Error("PostgreSQL connection not initialized");
      }
      const result = await handleSQLTablesResource(pgPool);
      return {
        uri: "mcp://db/tables",
        text: JSON.stringify(result, null, 2)
      };
    }
  };
} 