export const sqlQueryCreateTool = {
    name: "sql_query_create",
    description: "Execute CREATE or INSERT statements on Postgres database",
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
