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

  // Configure GCS credentials if available
  const gcsKeyId = process.env.GCS_KEY_ID;
  const gcsSecret = process.env.GCS_SECRET;

  if (gcsKeyId && gcsSecret) {
    try {
      await new Promise<void>((resolve, reject) => {
        conn.exec(`CREATE SECRET (
          TYPE gcs,
          KEY_ID '${gcsKeyId}',
          SECRET '${gcsSecret}'
        );`, (err: Error | null) => {
          if (err) {
            console.error("Failed to configure GCS credentials in DuckDB:", err);
            reject(err);
          } else {
            console.error("Successfully configured GCS credentials in DuckDB");
            resolve();
          }
        });
      });
    } catch (error) {
      console.error("Failed to configure GCS credentials:", error);
    }
  } else {
    console.error("No GCS credentials provided (GCS_KEY_ID and GCS_SECRET), GCS access may be limited");
  }

  return conn;
}
