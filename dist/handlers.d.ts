import { Pool } from 'pg';
import pkg from 'duckdb';
declare const duckdb: typeof pkg;
import { Storage } from '@google-cloud/storage';
type DuckDBConnection = InstanceType<typeof duckdb.Connection>;
export declare function createToolHandlers(pgPool: Pool | null, duckDBConn: DuckDBConnection | null): (request: any) => Promise<{
    content: any[];
}>;
export declare function createResourceHandlers(pgPool: Pool | null, gcs: Storage | null, gcsBucket: string | undefined): (request: any) => Promise<{
    content: any[];
    isError: boolean;
} | {
    contents: {
        uri: any;
        text: string;
    }[];
}>;
export {};
