import { Pool } from 'pg';

export async function handleSQLTablesResource(pool: Pool) {
  if (!pool) {
    throw new Error("PostgreSQL connection not initialized");
  }

  const result = await pool.query(`
    SELECT 
      table_schema as schema_name,
      table_name,
      json_agg(json_build_object(
        'column_name', column_name,
        'data_type', data_type,
        'is_nullable', is_nullable = 'YES'
      )) as columns
    FROM information_schema.columns
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    GROUP BY table_schema, table_name
    ORDER BY table_schema, table_name;
  `);

  return result.rows;
} 