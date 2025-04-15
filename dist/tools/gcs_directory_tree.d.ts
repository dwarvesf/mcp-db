import { MCPTool } from "mcp-framework";
import { z } from "zod";
export declare class GCSDirectoryTreeTool extends MCPTool {
    name: string;
    description: string;
    defaultBucket: string | undefined;
    schema: {
        bucket: {
            type: z.ZodOptional<z.ZodString>;
            description: string;
        };
        prefix: {
            type: z.ZodOptional<z.ZodString>;
            description: string;
        };
        delimiter: {
            type: z.ZodDefault<z.ZodOptional<z.ZodString>>;
            description: string;
        };
        limit: {
            type: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
            description: string;
        };
        pageToken: {
            type: z.ZodOptional<z.ZodString>;
            description: string;
        };
    };
    execute(args: {
        bucket?: string;
        prefix?: string;
        delimiter?: string;
        limit?: number;
        pageToken?: string;
    }): Promise<any>;
}
export default GCSDirectoryTreeTool;
