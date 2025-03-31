import pkg from 'duckdb';
const duckdb = pkg;
import { createDuckDBReadTool } from './read.js';
import { FastMCPTool } from '../types.js';

type DuckDBConnection = InstanceType<typeof duckdb.Connection>;

export function createDuckDBTools(duckDBConn: DuckDBConnection | null): FastMCPTool[] {
  return [
    createDuckDBReadTool(duckDBConn)
  ];
}

export * from './read.js'; 