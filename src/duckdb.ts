import pkg from 'duckdb';
const duckdb = pkg;

type DuckDBDatabase = InstanceType<typeof duckdb.Database>;
type DuckDBConnection = InstanceType<typeof duckdb.Connection>;

export async function setupDuckDB(): Promise<DuckDBConnection> {
  // Initialize database
  const db = await new Promise<DuckDBDatabase>((resolve, reject) => {
    const database = new duckdb.Database(':memory:', (err: Error | null) => {
      if (err) {
        console.error("Failed to initialize DuckDB:", err);
        reject(err);
      } else {
        resolve(database);
      }
    });
  });

  // Create connection
  const conn = await new Promise<DuckDBConnection>((resolve, reject) => {
    const connection = new duckdb.Connection(db, (err: Error | null) => {
      if (err) {
        console.error("Failed to create DuckDB connection:", err);
        reject(err);
      } else {
        resolve(connection);
      }
    });
  });
  
  // Enable required extensions
  await new Promise<void>((resolve, reject) => {
    conn.exec(`INSTALL httpfs;
               LOAD httpfs;`, (err: Error | null) => {
      if (err) {
        console.error("Failed to enable DuckDB extensions:", err);
        reject(err);
      } else {
        resolve();
      }
    });
  });

  return conn;
} 