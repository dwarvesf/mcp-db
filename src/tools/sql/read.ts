import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const sqlQueryReadTool: Tool = {
  name: "sql_query_read",
  description: "Execute SELECT queries on Postgres database (automatically limited to 1000 rows by default)",
  inputSchema: {
    type: "object",
    properties: {
      sql: {
        type: "string",
        description: "SQL query to execute. A LIMIT clause will be automatically added if not present.",
      },
      params: {
        type: "array",
        description: "Query parameters",
        items: { type: "string" }
      }
    },
    required: ["sql"]
  }
}; 