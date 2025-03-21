import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const duckDBReadTool: Tool = {
  name: "duckdb_read_parquet_files",
  description: "Query Parquet files from HTTPS links or GCS (automatically limited to 1000 rows by default)",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "SQL query to execute on Parquet files. A LIMIT clause will be automatically added if not present.",
      }
    },
    required: ["query"]
  }
}; 