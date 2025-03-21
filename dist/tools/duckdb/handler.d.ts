import pkg from 'duckdb';
declare const duckdb: typeof pkg;
import { DuckDBQueryArgs } from '../../types.js';
type DuckDBConnection = InstanceType<typeof duckdb.Connection>;
export declare function handleDuckDBQuery(conn: DuckDBConnection, args: DuckDBQueryArgs): Promise<any>;
export {};
