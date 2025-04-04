import { Resource } from "@modelcontextprotocol/sdk/types.js";

export const sqlTablesResource: Resource = {
  uri: "mcp://db/tables",
  name: "sql_tables",
  description: "List all tables in the Postgres database",
  schema: {
    type: "array",
    items: {
      type: "object",
      properties: {
        schema_name: {
          type: "string",
          description: "Schema name containing the table"
        },
        table_name: {
          type: "string",
          description: "Name of the table"
        },
        columns: {
          type: "array",
          items: {
            type: "object",
            properties: {
              column_name: {
                type: "string",
                description: "Name of the column"
              },
              data_type: {
                type: "string",
                description: "Data type of the column"
              },
              is_nullable: {
                type: "boolean",
                description: "Whether the column can be null"
              }
            }
          }
        }
      }
    }
  }
}; 