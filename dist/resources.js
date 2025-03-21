export const databaseSchemaResource = {
    name: "Database Schema",
    uri: "database://schema",
    description: "Lists schema information for all tables in the database"
};
export const tableSchemaResource = {
    name: "Table Schema",
    uri: "database://schema/{table}",
    description: "Gets schema information for a specific table"
};
export async function getDatabaseSchema(pool) {
    const query = `
    SELECT 
      t.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default
    FROM information_schema.tables t
    JOIN information_schema.columns c 
      ON t.table_name = c.table_name
    WHERE t.table_schema = 'public'
    ORDER BY t.table_name, c.ordinal_position;
  `;
    const result = await pool.query(query);
    const schemas = new Map();
    for (const row of result.rows) {
        if (!schemas.has(row.table_name)) {
            schemas.set(row.table_name, {
                table_name: row.table_name,
                columns: []
            });
        }
        schemas.get(row.table_name).columns.push({
            table_name: row.table_name,
            column_name: row.column_name,
            data_type: row.data_type,
            is_nullable: row.is_nullable,
            column_default: row.column_default
        });
    }
    return Array.from(schemas.values());
}
export async function getTableSchema(pool, tableName) {
    const query = `
    SELECT 
      t.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default
    FROM information_schema.tables t
    JOIN information_schema.columns c 
      ON t.table_name = c.table_name
    WHERE t.table_schema = 'public'
      AND t.table_name = $1
    ORDER BY c.ordinal_position;
  `;
    const result = await pool.query(query, [tableName]);
    if (result.rows.length === 0) {
        return null;
    }
    return {
        table_name: result.rows[0].table_name,
        columns: result.rows.map(row => ({
            table_name: row.table_name,
            column_name: row.column_name,
            data_type: row.data_type,
            is_nullable: row.is_nullable,
            column_default: row.column_default
        }))
    };
}
