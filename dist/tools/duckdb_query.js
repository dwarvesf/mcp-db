import { MCPTool, logger } from "mcp-framework";
import { z } from "zod";
import pkg from 'duckdb';
const duckdb = pkg;
import { formatSuccessResponse, formatErrorResponse } from '../utils.js';
import { POSTGRES_DB_ALIAS, executeQueryWithRetry } from '../services/duckdb.js';
// Use default generic type for MCPTool.
// The actual input type for execute will be validated by the base class using the 'schema' property below.
export class DuckDBQueryTool extends MCPTool {
    name = "duckdb_query";
    // Use the imported alias in the description
    description = `Executes a read-only SQL query directly on the attached PostgreSQL database ('${POSTGRES_DB_ALIAS}') using DuckDB. Automatically prefixes unqualified table names with '${POSTGRES_DB_ALIAS}.public.'.`;
    // Define schema matching the structure - simplified
    schema = {
        query: {
            type: z.string(),
            // Use the imported alias in the description
            description: `SQL query to execute directly on the attached PostgreSQL database ('${POSTGRES_DB_ALIAS}'). Example: 'SELECT * FROM my_table LIMIT 10'`,
        },
    };
    // Implement the execution logic
    // The 'args' type will be validated by the base MCPTool class against the 'schema' property.
    async execute(args) {
        logger.info(`Handling tool request: ${this.name}`);
        try {
            // Prefix unqualified table names
            const pgPrefix = `${POSTGRES_DB_ALIAS}.public.`;
            const modifiedQuery = args.query.replace(/\b(FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b(?!\.)/gi, (match, keyword, tableName) => {
                logger.info(`Prefixing table name: ${tableName} -> ${pgPrefix}${tableName}`);
                return `${keyword} ${pgPrefix}${tableName}`;
            });
            logger.info(`Executing modified query: ${modifiedQuery}`);
            // Use the new executeQueryWithRetry function
            const result = await executeQueryWithRetry(modifiedQuery, async (conn) => {
                return new Promise((resolve, reject) => {
                    conn.all(modifiedQuery, (err, result) => {
                        if (err) {
                            logger.error(`PostgreSQL query execution error: ${err}`);
                            reject(err);
                        }
                        else {
                            logger.info(`PostgreSQL query executed successfully`);
                            resolve(result);
                        }
                    });
                });
            });
            return formatSuccessResponse(result);
        }
        catch (error) {
            logger.error(`Error executing ${this.name}: ${error}`);
            return formatErrorResponse(error);
        }
    }
}
export default DuckDBQueryTool;
