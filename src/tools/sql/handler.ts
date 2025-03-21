import { Pool, QueryResult } from 'pg';
import { parse as parseSql } from 'pgsql-parser';

const DEFAULT_QUERY_LIMIT = 1000;

function addLimitToQuery(sql: string, limit: number = DEFAULT_QUERY_LIMIT): string {
  try {
    // Parse the SQL to check if it's a SELECT query
    const ast = parseSql(sql);
    const stmt = ast[0]?.RawStmt?.stmt;

    // Only add LIMIT to SELECT queries
    if (stmt?.SelectStmt) {
      // Check if query already has a LIMIT clause
      if (!stmt.SelectStmt.limitCount) {
        return `${sql} LIMIT ${limit}`;
      }
    }
    return sql;
  } catch (error) {
    // If parsing fails, try a simple regex approach as fallback
    const isSelect = /^\s*SELECT\b/i.test(sql);
    const hasLimit = /\bLIMIT\s+\d+\b/i.test(sql);
    
    if (isSelect && !hasLimit) {
      return `${sql} LIMIT ${limit}`;
    }
    return sql;
  }
}

export async function handlePostgreSQLQuery(
  pool: Pool,
  sql: string,
  params: any[] = []
): Promise<QueryResult> {
  if (!pool) {
    throw new Error("PostgreSQL connection not initialized");
  }

  try {
    // Add LIMIT clause to SELECT queries if not present
    const modifiedSql = addLimitToQuery(sql);
    if (modifiedSql !== sql) {
      console.error(`Query modified to include limit: ${modifiedSql}`);
    }

    return await pool.query(modifiedSql, params);
  } catch (error) {
    console.error("PostgreSQL query error:", error);
    throw error;
  }
} 