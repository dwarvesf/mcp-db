import { Pool } from 'pg';
import { createSqlQueryReadTool } from './read.js';
import { createSqlQueryCreateTool } from './create.js';
import { FastMCPTool } from '../types.js';

export function createSqlTools(pgPool: Pool | null): FastMCPTool[] {
  return [
    createSqlQueryReadTool(pgPool),
    createSqlQueryCreateTool(pgPool)
  ];
}

export * from './read.js';
export * from './create.js'; 