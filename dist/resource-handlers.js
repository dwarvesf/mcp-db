import { formatErrorResponse } from './utils.js';
export function createResourceHandlers(pgPool) {
    return async (request) => {
        console.error(`Received resource request: ${request.params.uri}`);
        try {
            if (!pgPool) {
                throw new Error("PostgreSQL connection not initialized");
            }
            switch (request.params.uri) {
                case "database://tables": {
                    const client = await pgPool.connect();
                    try {
                        const result = await client.query("SELECT table_name, table_schema FROM information_schema.tables WHERE table_schema = 'public'");
                        return {
                            contents: [{
                                    uri: 'database://tables',
                                    mimeType: 'application/json',
                                    text: JSON.stringify({
                                        tables: result.rows.map(row => ({
                                            name: row.table_name,
                                            schema: row.table_schema
                                        }))
                                    })
                                }]
                        };
                    }
                    finally {
                        client.release();
                    }
                }
                default:
                    throw new Error(`Resource not found: ${request.params.uri}`);
            }
        }
        catch (error) {
            return formatErrorResponse(error);
        }
    };
}
