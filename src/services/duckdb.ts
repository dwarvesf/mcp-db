import pkg from 'duckdb';
const duckdb = pkg;
import pgConnectionString from 'pg-connection-string'; // Import default
const { parse } = pgConnectionString; // Destructure parse function

type DuckDBDatabase = InstanceType<typeof duckdb.Database>;
type DuckDBConnection = InstanceType<typeof duckdb.Connection>;

let dbInstance: DuckDBDatabase | null = null;
let connectionInstance: DuckDBConnection | null = null;
let isConnectionValid = true;

// Define and export the alias used for the attached PostgreSQL database
export const POSTGRES_DB_ALIAS = 'postgres_db';

// Helper function to check if an error is fatal and requires restart
function isFatalError(error: Error): boolean {
  return error.message.includes('database has been invalidated') || 
         error.message.includes('Unsupported table filter type') ||
         error.message.includes('INTERNAL Error');
}

// Function to completely clean up DuckDB resources
async function cleanupDuckDB(): Promise<void> {
  try {
    if (connectionInstance) {
      connectionInstance.close();
      connectionInstance = null;
    }
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
  } catch (error) {
    console.error("Error during DuckDB cleanup:", error);
  }
}

// Function to initialize a fresh DuckDB instance
async function initializeDuckDB(): Promise<DuckDBConnection> {
  // First ensure we clean up any existing instances
  await cleanupDuckDB();

  // Initialize database
  dbInstance = await new Promise<DuckDBDatabase>((resolve, reject) => {
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
  connectionInstance = await new Promise<DuckDBConnection>((resolve, reject) => {
    const connection = new duckdb.Connection(dbInstance!, (err: Error | null) => {
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
    connectionInstance!.exec(`
      INSTALL httpfs;
      LOAD httpfs;
      INSTALL postgres;
      LOAD postgres;
      SET pg_experimental_filter_pushdown=true;
    `, (err: Error | null) => {
      if (err) {
        console.error("Failed to enable DuckDB extensions and configure settings:", err);
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
        connectionInstance!.exec(`CREATE SECRET (
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
      const pgConfig = parse(databaseUrl);

      const host = pgConfig.host || 'localhost';
      const port = pgConfig.port || '5432';
      const database = pgConfig.database;
      const user = pgConfig.user;
      const password = pgConfig.password;

      if (!database || !user) {
        throw new Error("DATABASE_URL is missing required components (database, user).");
      }

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
        connectionInstance!.exec(createSecretQuery, (err: Error | null) => {
          if (err) {
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

      // Attach PostgreSQL database with specific settings
      const attachQuery = `
        ATTACH '' AS ${POSTGRES_DB_ALIAS} (
          TYPE postgres,
          SECRET pg_secret
        );`;

      await new Promise<void>((resolve, reject) => {
         connectionInstance!.exec(attachQuery, (err: Error | null) => {
           if (err) {
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
    }
  } else {
    console.warn("DATABASE_URL not provided, skipping PostgreSQL secret configuration in DuckDB.");
  }

  return connectionInstance;
}

export async function setupDuckDB(): Promise<DuckDBConnection> {
  if (connectionInstance) {
    return connectionInstance;
  }
  return initializeDuckDB();
}

// Function to handle query execution with auto-restart
export async function executeQueryWithRetry<T>(query: string, executor: (conn: DuckDBConnection) => Promise<T>): Promise<T> {
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      const conn = await setupDuckDB();
      return await executor(conn);
    } catch (error) {
      if (error instanceof Error && isFatalError(error)) {
        retryCount++;
        console.error(`Fatal DuckDB error detected (attempt ${retryCount}/${maxRetries}), attempting to reset connection...`);
        await cleanupDuckDB();
        if (retryCount === maxRetries) {
          throw new Error(`Failed after ${maxRetries} retries: ${error.message}`);
        }
        // Add a small delay before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Maximum retry attempts reached");
}
