import pkg from 'duckdb';
const duckdb = pkg;
export async function handleDuckDBQuery(conn, args) {
    if (!args.query) {
        throw new Error("Query parameter is required");
    }
    return new Promise((resolve, reject) => {
        conn.all(args.query, (err, result) => {
            if (err) {
                console.error("DuckDB query execution error:", err);
                reject(err);
            }
            else {
                resolve(result);
            }
        });
    });
}
