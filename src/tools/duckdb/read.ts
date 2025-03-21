import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const duckDBReadTool: Tool = {
  name: "duckdb_read_parquet_files",
  description: "Query Parquet files from HTTPS links or GCS",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "SQL query to execute on Parquet files",
      }
    },
    required: ["query"]
  }
}; 