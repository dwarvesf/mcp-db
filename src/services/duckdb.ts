import pkg from 'duckdb';
const duckdb = pkg;
import pgConnectionString from 'pg-connection-string'; // Import default
const { parse } = pgConnectionString; // Destructure parse function

type DuckDBDatabase = InstanceType<typeof duckdb.Database>;
type DuckDBConnection = InstanceType<typeof duckdb.Connection>;

let connectionInstance: DuckDBConnection | null = null;

// Define and export the alias used for the attached PostgreSQL database
export const POSTGRES_DB_ALIAS = 'postgres_db';

export async function setupDuckDB(): Promise<DuckDBConnection> {
  if (connectionInstance) {
    return connectionInstance;
  }

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
                LOAD httpfs;
                INSTALL postgres;
                LOAD postgres;`, (err: Error | null) => { // Add postgres install/load
      if (err) {
        console.error("Failed to enable DuckDB httpfs/postgres extensions:", err);
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

  // Configure PostgreSQL connection via secret if DATABASE_URL is provided
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    console.error("DATABASE_URL found, configuring PostgreSQL secret in DuckDB...");
    try {
      const pgConfig = parse(databaseUrl); // Use pg-connection-string parser

      const host = pgConfig.host || 'localhost'; // Default if missing
      const port = pgConfig.port || '5432'; // Default PG port
      const database = pgConfig.database;
      const user = pgConfig.user;
      const password = pgConfig.password;

      if (!database || !user) { // Host might be implicit (e.g., Unix socket) but db/user are essential
        throw new Error("DATABASE_URL is missing required components (database, user).");
      }

      // Escape single quotes in password if necessary
      const escapedPassword = password ? password.replace(/'/g, "''") : '';

      const createSecretQuery = `
        CREATE SECRET pg_secret (
            TYPE postgres,
            HOST '${host}',
            PORT ${port},
            DATABASE '${database}',
            USER '${user}',
            PASSWORD '${escapedPassword}'
        );`;

      await new Promise<void>((resolve, reject) => {
        conn.exec(createSecretQuery, (err: Error | null) => {
          if (err) {
            // Check if secret already exists
            if (err.message.includes("already exists")) {
               console.warn("PostgreSQL secret 'pg_secret' already exists, skipping creation.");
               resolve();
            } else {
              console.error("Failed to create PostgreSQL secret 'pg_secret' in DuckDB:", err);
              reject(err);
            }
          } else {
            console.error("Successfully created PostgreSQL secret 'pg_secret' in DuckDB");
            resolve();
          }
        });
      });

      // Attach the database using the secret and the exported alias
      const attachQuery = `ATTACH '' AS ${POSTGRES_DB_ALIAS} (TYPE postgres, SECRET pg_secret);`;
      await new Promise<void>((resolve, reject) => {
         conn.exec(attachQuery, (err: Error | null) => {
           if (err) {
             // Check if already attached
             if (err.message.includes("already attached")) {
                console.warn("PostgreSQL database 'postgres_db' already attached, skipping attach.");
                resolve();
             } else {
               console.error("Failed to attach PostgreSQL database 'postgres_db':", err);
               reject(err);
             }
           } else {
             console.error("Successfully attached PostgreSQL database as 'postgres_db'");
             resolve();
           }
         });
       });

    } catch (error) {
      console.error("Failed to parse DATABASE_URL or configure PostgreSQL connection in DuckDB:", error);
      // Log the error and continue; tools relying on PG will fail later
    }
  } else {
    console.warn("DATABASE_URL not provided, skipping PostgreSQL secret configuration in DuckDB.");
  }


  connectionInstance = conn; // Store the connection instance
  return conn;
}

// Function to retrieve the initialized connection
export function getDuckDBConnection(): DuckDBConnection {
  if (!connectionInstance) {
    throw new Error("DuckDB connection has not been initialized. Call setupDuckDB first.");
  }
  return connectionInstance;
}
