import { MCPTool } from "mcp-framework";
import { z } from "zod";
export declare class DuckDBUpdateTool extends MCPTool {
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
export default DuckDBUpdateTool;
