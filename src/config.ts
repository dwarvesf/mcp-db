import { z } from 'zod';

const ConfigSchema = z.object({
  databaseUrl: z.string().url().optional(),
  logLevel: z.enum(['debug', 'info', 'error']).default('info')
});

export function validateConfig(args: any) {
  // Validate that either database or parquet sources are provided
  if (!args['--database-url']) {
    throw new Error('Must provide either --database-url');
  }

  return ConfigSchema.parse({
    databaseUrl: args['--database-url'],
    logLevel: args['--log-level'] || 'info'
  });
} 