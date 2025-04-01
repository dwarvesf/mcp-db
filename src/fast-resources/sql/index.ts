import { Pool } from 'pg';
import { createSQLTablesResource } from './tables.js';
import { FastMCPResource } from '../../fast-tools/types.js';

export function createSQLResources(pgPool: Pool | null): FastMCPResource[] {
  return [
    createSQLTablesResource(pgPool)
  ];
}

export * from './tables.js'; 