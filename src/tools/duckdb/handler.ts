import pkg from 'duckdb';
const duckdb = pkg;
import { DuckDBQueryArgs } from '../../types.js';

type DuckDBConnection = InstanceType<typeof duckdb.Connection>;

export async function handleDuckDBQuery(
  conn: DuckDBConnection,
  args: DuckDBQueryArgs
): Promise<any> {
  if (!args.query) {
    throw new Error("Query parameter is required");
  }

  return new Promise((resolve, reject) => {
    conn.all(args.query, (err, result) => {
      if (err) {
        console.error("DuckDB query execution error:", err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
} 