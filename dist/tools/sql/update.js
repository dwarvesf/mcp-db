export const sqlQueryUpdateTool = {
    name: "sql_query_update",
    description: "Execute UPDATE statements on Postgres database",
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
