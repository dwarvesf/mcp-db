import { Pool, QueryResult } from 'pg';

const DEFAULT_QUERY_LIMIT = 1000;

function isSelectQuery(sql: string): boolean {
  // Remove comments and normalize whitespace
  const normalizedSql = sql
    .replace(/--.*$/gm, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//gm, '') // Remove multi-line comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .toLowerCase();

  // Check if it's a SELECT query
  // This regex matches SELECT at the start, accounting for WITH clauses
  return /^(with\s+[\s\S]+\s+)?\s*select\s/i.test(normalizedSql);
}

function hasLimitClause(sql: string): boolean {
  // Remove comments and normalize whitespace
  const normalizedSql = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  // Check for LIMIT clause, accounting for possible OFFSET
  return /\blimit\s+\d+(\s*,\s*\d+|\s+offset\s+\d+)?\s*;?\s*$/i.test(normalizedSql);
}

function addLimitToQuery(sql: string, limit: number = DEFAULT_QUERY_LIMIT): string {
  if (isSelectQuery(sql) && !hasLimitClause(sql)) {
    // Remove trailing semicolon if present
    const trimmedSql = sql.trim().replace(/;$/, '');
    return `${trimmedSql} LIMIT ${limit}`;
  }
  return sql;
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