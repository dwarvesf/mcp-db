import { MCPResource } from "mcp-framework";
import { serializeBigInt } from '../utils.js'; // Adjust path as needed
import { setupDuckDB, POSTGRES_DB_ALIAS } from "../services/duckdb.js"; // Import DuckDB setup
import type { Connection as DuckDBConnection } from 'duckdb'; // Import DuckDB types

export class SQLTablesResource extends MCPResource { // Changed to export default
  uri = "mcp://db/tables"; // Keep original URI
  name = "sql_tables";
  description = "List all tables and their columns in the Postgres database";
  mimeType = "application/json"; // Define MIME type

  private duckDBConnection!: DuckDBConnection; // Store the DuckDB connection
  private duckDBConnectionPromise: Promise<DuckDBConnection>; // Store the promise

  // Constructor initializes DuckDB connection internally
  constructor() {
    super();
    // Initialize DuckDB connection asynchronously, store the promise
    // setupDuckDB handles checking for DATABASE_URL internally
    this.duckDBConnectionPromise = setupDuckDB().then(conn => {
      if (!conn) {
        throw new Error("Failed to initialize DuckDB connection for SQLTablesResource");
      }
      this.duckDBConnection = conn; // Assign when resolved
      return conn;
    }).catch(error => {
        console.error("Error during DuckDB setup in SQLTablesResource:", error);
        throw new Error(`Failed to setup DuckDB: ${error.message}`);
    });
  }

  // Implement the read logic to fetch table and column info using DuckDB
  async read(): Promise<Array<{ uri: string; mimeType?: string; text: string }>> {
    console.error(`Handling resource request: ${this.uri}`);
    try {
      // Ensure DuckDB connection is initialized before proceeding
      const conn = await this.duckDBConnectionPromise;

      // Query to get tables and columns from the attached PostgreSQL database's information_schema via DuckDB
      // Use the alias defined in duckdb.ts
      const query = `
        SELECT
          t.table_schema as schema_name,
          t.table_name,
          -- Use DuckDB JSON functions: json_group_array and json_object
          json_group_array(json_object(
            'column_name', c.column_name,
            'data_type', c.data_type,
            'is_nullable', c.is_nullable = 'YES'
          -- Ordering within json_group_array might require subquery/window function in DuckDB if strictly needed.
          -- Keeping it simple first. If order is critical, query needs adjustment.
          )) as columns
        FROM ${POSTGRES_DB_ALIAS}.information_schema.tables t
        JOIN ${POSTGRES_DB_ALIAS}.information_schema.columns c
          ON t.table_schema = c.table_schema AND t.table_name = c.table_name
        WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema') -- Exclude system schemas from the *attached* PG DB
        GROUP BY t.table_schema, t.table_name
        ORDER BY t.table_schema, t.table_name;
      `;

      // Execute the query using the DuckDB connection
      const tablesData = await new Promise<any[]>((resolve, reject) => {
        conn.all(query, (err, res) => {
          if (err) {
            console.error(`DuckDB query error in ${this.uri}:`, err);
            reject(new Error(`DuckDB query failed: ${err.message}`));
          } else {
            resolve(res);
          }
        });
      });

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

export default SQLTablesResource; // Export the class as default
