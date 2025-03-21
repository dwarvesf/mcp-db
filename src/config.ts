import { z } from 'zod';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

const ConfigSchema = z.object({
  databaseUrl: z.string().url(),
  logLevel: z.enum(['debug', 'info', 'error']).default('info')
});

export function validateConfig(args: any) {
  const databaseUrl = process.env.DATABASE_URL;
  const logLevel = args['--log-level'] || process.env.LOG_LEVEL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable must be provided in .env file');
  }

  return ConfigSchema.parse({
    databaseUrl,
    logLevel: logLevel || 'info'
  });
}
