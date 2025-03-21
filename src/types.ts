import { QueryResult } from 'pg';

export interface SQLQueryArgs {
  sql: string;
  params?: any[];
}

export interface DuckDBQueryArgs {
  query: string;
}

export interface ToolHandlers {
  sqlQueryCreate: (args: SQLQueryArgs) => Promise<QueryResult>;
  sqlQueryRead: (args: SQLQueryArgs) => Promise<QueryResult>;
  sqlQueryUpdate: (args: SQLQueryArgs) => Promise<QueryResult>;
  sqlQueryDelete: (args: SQLQueryArgs) => Promise<QueryResult>;
  duckDBReadParquetFiles: (args: DuckDBQueryArgs) => Promise<any>;
}

export interface ServerConfig {
  databaseUrl?: string;
  logLevel?: string;
} 