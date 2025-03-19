import { z } from 'zod';

const ConfigSchema = z.object({
  databaseUrl: z.string().url().optional(),
  gcsBucket: z.string().optional(),
  gcsDirs: z.array(z.string()).optional(),
  parquetLinks: z.array(z.string().url()).optional(),
  logLevel: z.enum(['debug', 'info', 'error']).default('info')
});

export function validateConfig(args: any) {
  // Validate that either database or parquet sources are provided
  if (!args['--database-url'] && !args['--parquet-links']?.length && !args['--gcs-bucket']) {
    throw new Error('Must provide either --database-url, --parquet-links, or --gcs-bucket');
  }

  // Validate GCS configuration
  if (args['--gcs-bucket'] && !args['--gcs-dirs']?.length) {
    throw new Error('--gcs-dirs must be specified when using --gcs-bucket');
  }

  return ConfigSchema.parse({
    databaseUrl: args['--database-url'],
    gcsBucket: args['--gcs-bucket'],
    gcsDirs: args['--gcs-dirs'],
    parquetLinks: args['--parquet-links'],
    logLevel: args['--log-level'] || 'info'
  });
} 