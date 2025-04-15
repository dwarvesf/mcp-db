import pkg from 'pg';
export declare function setupPostgres(connectionString: string): Promise<pkg.Pool>;
