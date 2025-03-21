import { getClient } from '../../services/postgres.js';
export const listTablesResource = {
    name: 'sql_tables',
    description: 'List all tables in the connected PostgreSQL database',
    handler: async () => {
        const client = await getClient();
        try {
            const result = await client.query(`
        SELECT 
          table_schema,
          table_name,
          (
            SELECT json_agg(json_build_object(
              'column_name', column_name,
              'data_type', data_type,
              'is_nullable', is_nullable
            ))
            FROM information_schema.columns
            WHERE table_schema = t.table_schema
            AND table_name = t.table_name
          ) as columns
        FROM information_schema.tables t
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY table_schema, table_name;
      `);
            return {
                tables: result.rows.map(row => ({
                    schema: row.table_schema,
                    name: row.table_name,
                    columns: row.columns
                }))
            };
        }
        finally {
            client.release();
        }
    }
};
