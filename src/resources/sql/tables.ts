import { Resource } from "@modelcontextprotocol/sdk/types.js";

export const sqlTablesResource: Resource = {
  uri: "postgres://tables",
  uriTemplate: "postgres://{database}/{schema}.{table}/schema",
  name: "sql_tables",
  description: "Schema information for tables in the Postgres database",
  schema: {
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
}; 