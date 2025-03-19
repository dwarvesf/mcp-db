import * as duckdb from 'duckdb';

export async function setupDuckDB() {
  const db = new duckdb.Database(':memory:');
  
  // Enable required extensions
  await db.all(`INSTALL httpfs;
                LOAD httpfs;
                INSTALL parquet;
                LOAD parquet;`);

  return db;
} 