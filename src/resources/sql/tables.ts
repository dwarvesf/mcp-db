import { MCPResource } from "mcp-framework";
import { Pool } from 'pg';
import { serializeBigInt } from '../../utils.js'; // Adjust path as needed

export default class SQLTablesResource extends MCPResource { // Changed to export default
  uri = "mcp://db/tables"; // Keep original URI
  name = "sql_tables";
  description = "List all tables and their columns in the Postgres database";
  mimeType = "application/json"; // Define MIME type

  private pgPool: Pool;

  // Constructor to receive dependencies
  constructor(pgPool: Pool) {
    super();
    if (!pgPool) {
      throw new Error("PostgreSQL connection pool is required for SQLTablesResource");
    }
    this.pgPool = pgPool;
  }

  // Implement the read logic to fetch table and column info
  async read(): Promise<Array<{ uri: string; mimeType?: string; text: string }>> {
    console.error(`Handling resource request: ${this.uri}`);
    try {
      // Query to get tables and columns from information_schema
      const query = `
        SELECT
          t.table_schema as schema_name,
          t.table_name,
          json_agg(json_build_object(
            'column_name', c.column_name,
            'data_type', c.data_type,
            'is_nullable', c.is_nullable = 'YES'
          ) ORDER BY c.ordinal_position) as columns
        FROM information_schema.tables t
        JOIN information_schema.columns c
          ON t.table_schema = c.table_schema AND t.table_name = c.table_name
        WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema') -- Exclude system schemas
        GROUP BY t.table_schema, t.table_name
        ORDER BY t.table_schema, t.table_name;
      `;

      const result = await this.pgPool.query(query);
      const tablesData = result.rows; // Data is already structured by the query

      return [
        {
          uri: this.uri,
          mimeType: this.mimeType,
          text: JSON.stringify(serializeBigInt(tablesData), null, 2),
        },
      ];
    } catch (error) {
      console.error(`Error reading resource ${this.uri}:`, error);
      throw new Error(`SQL Tables Resource Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
