import pkg from 'duckdb';
declare const duckdb: typeof pkg;
type DuckDBConnection = InstanceType<typeof duckdb.Connection>;
export declare const POSTGRES_DB_ALIAS = "postgres_db";
export declare function setupDuckDB(): Promise<DuckDBConnection>;
export declare function executeQueryWithRetry<T>(query: string, executor: (conn: DuckDBConnection) => Promise<T>): Promise<T>;
export {};
