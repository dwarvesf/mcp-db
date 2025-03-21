import pkg from 'duckdb';
const duckdb = pkg;
export async function setupDuckDB() {
    // Initialize database
    const db = await new Promise((resolve, reject) => {
        const database = new duckdb.Database(':memory:', (err) => {
            if (err) {
                console.error("Failed to initialize DuckDB:", err);
                reject(err);
            }
            else {
                resolve(database);
            }
        });
    });
    // Create connection
    const conn = await new Promise((resolve, reject) => {
        const connection = new duckdb.Connection(db, (err) => {
            if (err) {
                console.error("Failed to create DuckDB connection:", err);
                reject(err);
            }
            else {
                resolve(connection);
            }
        });
    });
    // Enable required extensions
    await new Promise((resolve, reject) => {
        conn.exec(`INSTALL httpfs;
               LOAD httpfs;`, (err) => {
            if (err) {
                console.error("Failed to enable DuckDB extensions:", err);
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
    return conn;
}
