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
export const sqlQueryDeleteTool = {
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
export const duckDBReadTool = {
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
export const tools = [
    sqlQueryCreateTool,
    sqlQueryReadTool,
    sqlQueryUpdateTool,
    sqlQueryDeleteTool,
    duckDBReadTool
];
