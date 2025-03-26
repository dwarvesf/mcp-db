import { Pool } from 'pg';

interface TableColumn {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
}

interface TableResource {
  uri: string;
  name: string;
  description: string;
  content: {
    schema_name: string;
    table_name: string;
    columns: TableColumn[];
  };
}

export async function handleSQLTablesResource(pool: Pool): Promise<TableResource[]> {
  if (!pool) {
    throw new Error("PostgreSQL connection not initialized");
  }

  // First get the database name
  const dbResult = await pool.query('SELECT current_database() as dbname');
  const dbName = dbResult.rows[0].dbname;

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

  // Transform each table into a resource with postgres:// URI
  return result.rows.map(row => ({
    uri: `postgres://${dbName}/${row.schema_name}.${row.table_name}/schema`,
    name: `${row.schema_name}.${row.table_name}`,
    description: `Schema for table ${row.schema_name}.${row.table_name}`,
    content: {
      schema_name: row.schema_name,
      table_name: row.table_name,
      columns: row.columns
    }
  }));
} 