import { Pool } from 'pg';
import pkg from 'duckdb';
const duckdb = pkg;
import { Storage } from '@google-cloud/storage';
import { createSqlTools } from './sql/index.js';
import { createDuckDBTools } from './duckdb/index.js';
import { createGCSTools } from './gcs/index.js';
import { FastMCPTool } from './types.js';

type DuckDBConnection = InstanceType<typeof duckdb.Connection>;

export function createTools(
  pgPool: Pool | null, 
  duckDBConn: DuckDBConnection | null,
  gcs: Storage | null,
  gcsBucket: string | undefined
): FastMCPTool[] {
  return [
    ...createSqlTools(pgPool),
    ...createDuckDBTools(duckDBConn),
    ...createGCSTools(gcs, gcsBucket)
  ];
}

export * from './sql/index.js';
export * from './duckdb/index.js';
export * from './gcs/index.js';
export * from './types.js'; 