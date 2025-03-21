import { Pool, QueryResult } from 'pg';

export async function handlePostgreSQLQuery(
  pool: Pool,
  sql: string,
  params: any[] = []
): Promise<QueryResult> {
  if (!pool) {
    throw new Error("PostgreSQL connection not initialized");
  }

  try {
    return await pool.query(sql, params);
  } catch (error) {
    console.error("PostgreSQL query error:", error);
    throw error;
  }
} 