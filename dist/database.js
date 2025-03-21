import pkg from "pg";
const { Pool } = pkg;
export class DatabaseResource {
    constructor(config) {
        this.config = config;
        this.uri = `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
        this.name = "postgres-database";
        this.pool = new Pool({
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.user,
            password: config.password,
            ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
        });
    }
    async connect() {
        try {
            await this.pool.connect();
        }
        catch (error) {
            console.error("Failed to connect to database:", error);
            throw error;
        }
    }
    async disconnect() {
        await this.pool.end();
    }
    async query(sql, params) {
        try {
            const result = await this.pool.query(sql, params);
            return result;
        }
        catch (error) {
            console.error("Database query error:", error);
            throw error;
        }
    }
    async transaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query("BEGIN");
            const result = await callback(client);
            await client.query("COMMIT");
            return result;
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    }
}
export const createDatabaseResource = (config) => {
    return new DatabaseResource(config);
};
