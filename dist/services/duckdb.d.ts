import pkg from 'duckdb';
declare const duckdb: typeof pkg;
type DuckDBConnection = InstanceType<typeof duckdb.Connection>;
export declare function setupDuckDB(): Promise<DuckDBConnection>;
export {};
