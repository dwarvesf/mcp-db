import { Pool, QueryResult } from 'pg';
export declare function handlePostgreSQLQuery(pool: Pool, sql: string, params?: any[]): Promise<QueryResult>;
