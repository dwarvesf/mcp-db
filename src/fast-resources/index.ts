import { Pool } from 'pg';
import { Storage } from '@google-cloud/storage';
import { createSQLResources } from './sql/index.js';
import { createGCSResources } from './gcs/index.js';
import { FastMCPResource } from '../fast-tools/types.js';

export function createResources(
  pgPool: Pool | null,
  gcs: Storage | null,
  gcsBucket: string | undefined
): FastMCPResource[] {
  return [
    ...createSQLResources(pgPool),
    ...createGCSResources(gcs, gcsBucket)
  ];
}

export * from './sql/index.js';
export * from './gcs/index.js'; 