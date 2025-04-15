import { MCPTool } from "mcp-framework";
import { z } from "zod";
export declare class DuckDBReadParquetTool extends MCPTool {
    name: string;
    description: string;
    schema: {
        query: {
            type: z.ZodString;
            description: string;
        };
    };
    execute(args: {
        query: string;
    }): Promise<any>;
}
export default DuckDBReadParquetTool;
