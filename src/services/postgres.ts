import pkg from 'pg';
const { Pool } = pkg;

export async function setupPostgres(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 20
  });

  // Test connection
  try {
    await pool.query('SELECT 1');
    console.error('Successfully connected to PostgreSQL');
  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error);
    throw error;
  }

  return pool;
}
