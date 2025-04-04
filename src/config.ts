import { z } from 'zod';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

const ConfigSchema = z.object({
  databaseUrl: z.string().url().optional(),
  logLevel: z.enum(['debug', 'info', 'error']).default('info'),
  gcsBucket: z.string().optional(),
  transport: z.enum(['stdio', 'sse']).default('stdio'),
  port: z.number().min(1).max(65535).default(3001),
  host: z.string().default('localhost'),
  timeout: z.number().min(1000).default(300000) // Default timeout: 5 minutes (300000ms)
});

export function validateConfig(args: any) {
  const databaseUrl = process.env.DATABASE_URL;
  const logLevel = args['--log-level'] || process.env.LOG_LEVEL;
  const gcsBucket = args['--gcs-bucket'] || process.env.GCS_BUCKET;
  const transport = args['--transport'] || process.env.TRANSPORT || 'stdio';
  const port = args['--port'] || parseInt(process.env.PORT || '3001', 10);
  const host = args['--host'] || process.env.HOST || 'localhost';
  const timeout = args['--timeout'] || parseInt(process.env.TIMEOUT || '300000', 10);

  // Check if we're running in supergateway (it sets specific environment variables)
  const isInSupergateway = process.env.SUPERGATEWAY_PORT || process.env.SUPERGATEWAY_SSE_PATH;

  // Only require DATABASE_URL if not in supergateway
  if (!databaseUrl && !isInSupergateway) {
    console.error('\nConfiguration Error:');
    console.error('DATABASE_URL environment variable is required.');
    console.error('\nTo fix this, either:');
    console.error('1. Set the environment variable:');
    console.error('   export DATABASE_URL="postgresql://user:password@localhost:5432/mydb"');
    console.error('\n2. Or create a .env file with:');
    console.error('   DATABASE_URL=postgresql://user:password@localhost:5432/mydb');
    console.error('\n3. Or run with supergateway to skip database features\n');
    throw new Error('DATABASE_URL environment variable is required');
  }

  try {
    return ConfigSchema.parse({
      databaseUrl,
      logLevel: logLevel || 'info',
      gcsBucket,
      transport,
      port,
      host,
      timeout
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('\nConfiguration Validation Errors:');
      error.errors.forEach(err => {
        console.error(`- ${err.path.join('.')}: ${err.message}`);
      });
      console.error();
    }
    throw error;
  }
}
