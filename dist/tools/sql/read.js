export const sqlQueryReadTool = {
    name: "sql_query_read",
    description: "Execute SELECT queries on Postgres database",
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
