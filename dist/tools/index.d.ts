export declare const tools: {
    [x: string]: unknown;
    name: string;
    inputSchema: {
        [x: string]: unknown;
        type: "object";
        properties?: {
            [x: string]: unknown;
        } | undefined;
    };
    description?: string | undefined;
}[];
export * from './sql/index.js';
export * from './duckdb/index.js';
