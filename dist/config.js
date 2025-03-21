import { z } from 'zod';
import { config } from 'dotenv';
// Load environment variables from .env file
config();
const ConfigSchema = z.object({
    databaseUrl: z.string().url().optional(),
    logLevel: z.enum(['debug', 'info', 'error']).default('info'),
    gcsBucket: z.string().optional()
});
export function validateConfig(args) {
    const databaseUrl = process.env.DATABASE_URL;
    const logLevel = args['--log-level'] || process.env.LOG_LEVEL;
    const gcsBucket = args['--gcs-bucket'] || process.env.GCS_BUCKET;
    // If neither database nor GCS features are configured, show usage
    if (!databaseUrl && !gcsBucket) {
        console.error('Error: No features are configured. You must provide at least one of:');
        console.error('- DATABASE_URL environment variable for database features');
        console.error('- --gcs-bucket flag or GCS_BUCKET environment variable for GCS features');
        process.exit(1);
    }
    return ConfigSchema.parse({
        databaseUrl,
        logLevel: logLevel || 'info',
        gcsBucket
    });
}
