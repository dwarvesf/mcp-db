import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const sqlQueryDeleteTool: Tool = {
  name: "sql_query_delete",
  description: "Execute DELETE statements on Postgres database",
  inputSchema: {
    type: "object",
    properties: {
      sql: {
        type: "string",
        description: "SQL query to execute",
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