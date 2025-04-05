import { z } from 'zod';
import { config } from 'dotenv';
// Import pg-connection-string using default import for CJS compatibility
import pgConnectionString from 'pg-connection-string';
const { parse: parseConnectionString } = pgConnectionString; // Destructure parse

// Load environment variables from .env file
config();

const ConfigSchema = z.object({
  // Map of alias -> connection string URL
  databaseConnections: z.record(z.string().url()).optional(),
  // Single URL for backward compatibility
  databaseUrl: z.string().url().optional(),
  logLevel: z.enum(['debug', 'info', 'error']).default('info'),
  gcsBucket: z.string().optional(),
  transport: z.enum(['stdio', 'sse']).default('stdio'),
  port: z.number().min(1).max(65535).default(3001),
  host: z.string().default('localhost'),
  // Add apiKey
  apiKey: z.string().optional()
});

export type AppConfig = z.infer<typeof ConfigSchema>;

let validatedConfigInstance: AppConfig | null = null;

// Helper function to parse alias=url pairs
function parseDatabaseUrls(inputs: string[]): Record<string, string> | null {
  if (!inputs || inputs.length === 0) {
    return null;
  }

  const connections: Record<string, string> = {};
  const errors: string[] = [];

  inputs.forEach((input, index) => {
    const parts = input.split('=', 2);
    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
      errors.push(`Invalid format for input #${index + 1}: "${input}". Expected format: alias=connection_string`);
      return;
    }
    const alias = parts[0].trim();
    const url = parts[1].trim();

    // Basic URL validation (more thorough validation happens in Zod)
    try {
      new URL(url); // Check if it's a parseable URL
      // Validate connection string components (optional, but good practice)
      parseConnectionString(url);
    } catch (e) {
      errors.push(`Invalid connection string URL for alias "${alias}": ${url} (${(e as Error).message})`);
      return;
    }

    if (connections[alias]) {
      errors.push(`Duplicate alias found: "${alias}". Aliases must be unique.`);
      return;
    }
    connections[alias] = url;
  });

  if (errors.length > 0) {
    console.error('\nDatabase URL Configuration Errors:');
    errors.forEach(err => console.error(`- ${err}`));
    console.error();
    throw new Error('Invalid database URL configuration.');
  }

  return Object.keys(connections).length > 0 ? connections : null;
}


export function validateConfig(args: any): AppConfig {
  // --- Database Configuration ---
  let databaseConnections: Record<string, string> | undefined;
  let databaseUrl: string | undefined;

  // 1. Check --database-urls command line arguments
  const cliUrls: string[] | undefined = args['--database-urls'];
  if (cliUrls && cliUrls.length > 0) {
    databaseConnections = parseDatabaseUrls(cliUrls) ?? undefined;
  }

  // 2. If not found in CLI, check DATABASE_URLS environment variable
  if (!databaseConnections) {
    const envUrlsString = process.env.DATABASE_URLS;
    if (envUrlsString) {
      const envUrls = envUrlsString.split(',').map(s => s.trim()).filter(Boolean);
      databaseConnections = parseDatabaseUrls(envUrls) ?? undefined;
    }
  }

  // 3. If still not found, fall back to single DATABASE_URL (env var or --database-url arg)
  if (!databaseConnections) {
    databaseUrl = args['--database-url'] || process.env.DATABASE_URL;
  }

  // --- Other Configurations ---
  const logLevel = args['--log-level'] || process.env.LOG_LEVEL;
  const gcsBucket = args['--gcs-bucket'] || process.env.GCS_BUCKET;
  const transport = args['--transport'] || process.env.TRANSPORT || 'stdio';
  const port = args['--port'] ? parseInt(String(args['--port']), 10) : parseInt(process.env.PORT || '3001', 10);
  const host = args['--host'] || process.env.HOST || 'localhost';
  // Read API Key from environment
  const apiKey = process.env.API_KEY;

  // Check if we're running in supergateway (it sets specific environment variables)
  const isInSupergateway = process.env.SUPERGATEWAY_PORT || process.env.SUPERGATEWAY_SSE_PATH;

  // Require database configuration only if not in supergateway
  if (!databaseConnections && !databaseUrl && !isInSupergateway) {
    console.error('\nConfiguration Error:');
    console.error('Database configuration is required (DATABASE_URLS, --database-urls, or DATABASE_URL).');
    console.error('\nTo fix this, provide database connection details via:');
    console.error('1. Environment Variable (comma-separated pairs):');
    console.error('   export DATABASE_URLS="db1=postgres://...,db2=postgres://..."');
    console.error('2. Command Line Arguments (repeatable):');
    console.error('   --database-urls "db1=postgres://..." --database-urls "db2=postgres://..."');
    console.error('3. Environment Variable (single URL, backward compatible):');
    console.error('   export DATABASE_URL="postgresql://user:password@localhost:5432/mydb"');
    console.error('4. Or run with supergateway to skip database features.\n');
    throw new Error('Database configuration is required');
  }

  try {
    // Prepare object for Zod validation
    const configToValidate = {
      databaseConnections,
      databaseUrl,
      logLevel: logLevel || 'info',
      gcsBucket,
      transport,
      port,
      host,
      apiKey // Include apiKey in the object to be validated
    };

    const parsedConfig = ConfigSchema.parse(configToValidate);
    validatedConfigInstance = parsedConfig; // Store the validated config
    return parsedConfig;

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

// Function to retrieve the validated configuration
export function getConfig(): AppConfig {
  if (!validatedConfigInstance) {
    throw new Error("Configuration has not been validated yet. Call validateConfig first.");
  }
  return validatedConfigInstance;
}
