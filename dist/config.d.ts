import { z } from 'zod';
declare const ConfigSchema: z.ZodObject<{
    databaseConnections: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    databaseUrl: z.ZodOptional<z.ZodString>;
    logLevel: z.ZodDefault<z.ZodEnum<["debug", "info", "error"]>>;
    gcsBucket: z.ZodOptional<z.ZodString>;
    transport: z.ZodDefault<z.ZodEnum<["stdio", "sse"]>>;
    port: z.ZodDefault<z.ZodNumber>;
    host: z.ZodDefault<z.ZodString>;
    apiKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    logLevel: "debug" | "info" | "error";
    transport: "stdio" | "sse";
    port: number;
    host: string;
    databaseConnections?: Record<string, string> | undefined;
    databaseUrl?: string | undefined;
    gcsBucket?: string | undefined;
    apiKey?: string | undefined;
}, {
    databaseConnections?: Record<string, string> | undefined;
    databaseUrl?: string | undefined;
    logLevel?: "debug" | "info" | "error" | undefined;
    gcsBucket?: string | undefined;
    transport?: "stdio" | "sse" | undefined;
    port?: number | undefined;
    host?: string | undefined;
    apiKey?: string | undefined;
}>;
export type AppConfig = z.infer<typeof ConfigSchema>;
export declare function validateConfig(args: any): AppConfig;
export declare function getConfig(): AppConfig;
export {};
