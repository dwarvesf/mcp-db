import pkg from 'duckdb';
const duckdb = pkg;
import { DuckDBQueryArgs } from '../../types.js';

type DuckDBConnection = InstanceType<typeof duckdb.Connection>;

const DEFAULT_QUERY_LIMIT = 1000;

function addLimitToQuery(sql: string, limit: number = DEFAULT_QUERY_LIMIT): string {
  // Check if query already has a LIMIT clause
  const hasLimit = /\bLIMIT\s+\d+\b/i.test(sql);
  
  if (!hasLimit) {
    return `${sql} LIMIT ${limit}`;
  }
  return sql;
}

export async function handleDuckDBQuery(
  conn: DuckDBConnection,
  args: DuckDBQueryArgs
): Promise<any> {
  if (!args.query) {
    throw new Error("Query parameter is required");
  }

  // Add LIMIT clause if not present
  const modifiedQuery = addLimitToQuery(args.query);
  if (modifiedQuery !== args.query) {
    console.error(`Query modified to include limit: ${modifiedQuery}`);
  }

  return new Promise((resolve, reject) => {
    conn.all(modifiedQuery, (err, result) => {
      if (err) {
        console.error("DuckDB query execution error:", err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
} 