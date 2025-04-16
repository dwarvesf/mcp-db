import pkg from 'pg';
const { Pool } = pkg;
import { getConfig } from '../config.js';

// Define the type for the Pool instance
type PostgresPool = InstanceType<typeof Pool>;

// Global instance of the PostgreSQL connection pool
let poolInstance: PostgresPool | null = null;

/**
 * Initialize a new PostgreSQL connection pool
 * @param connectionString - PostgreSQL connection string
 * @returns The initialized Pool instance
 */
async function initializePostgres(connectionString: string): Promise<PostgresPool> {
  // Create a new pool
  const pool = new Pool({
    connectionString,
    max: 20
  });

  // Test connection
  try {
    await pool.query('SELECT 1');
    console.error('Successfully connected to PostgreSQL');
    poolInstance = pool;
    return pool;
  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error);
    throw error;
  }
}

/**
 * Set up PostgreSQL connection with the provided connection string
 * If a connection already exists, it will be reused
 * @param connectionString - PostgreSQL connection string
 * @returns The PostgreSQL connection pool
 */
export async function setupPostgres(connectionString: string): Promise<PostgresPool> {
  if (poolInstance) {
    return poolInstance;
  }
  return initializePostgres(connectionString);
}

/**
 * Get the PostgreSQL connection pool
 * If no pool exists, it will attempt to create one using the connection string from config or environment
 * @returns The PostgreSQL connection pool
 */
export async function getPostgresPool(): Promise<PostgresPool> {
  if (poolInstance) {
    return poolInstance;
  }

  // Get database connection from config
  let config;
  try {
    config = getConfig();
  } catch (error) {
    console.warn("Failed to get validated config, will try environment variables as fallback:", error);
    config = null;
  }

  // First try databaseUrl from config
  let databaseUrl = config?.databaseUrl;
  
  // If not available, fall back to environment variable
  if (!databaseUrl) {
    databaseUrl = process.env.DATABASE_URL;
  }

  if (!databaseUrl) {
    throw new Error("No database URL configured. Please set DATABASE_URL environment variable or configure it in the app config.");
  }

  return initializePostgres(databaseUrl);
}

/**
 * Clean up PostgreSQL resources
 */
export async function cleanupPostgres(): Promise<void> {
  try {
    if (poolInstance) {
      await poolInstance.end();
      poolInstance = null;
      console.error("PostgreSQL connection pool closed");
    }
  } catch (error) {
    console.error("Error during PostgreSQL cleanup:", error);
  }
}
