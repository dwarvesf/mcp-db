import { Storage } from '@google-cloud/storage';

const DEFAULT_LIMIT = 1000;

export interface GCSDirectoryTreeArgs {
  prefix?: string;
  delimiter?: string;
  limit?: number;
  offset?: number;
}

export async function handleGCSDirectoryTree(
  gcs: Storage,
  bucket: string,
  args: GCSDirectoryTreeArgs
) {
  if (!gcs) {
    throw new Error("GCS not initialized");
  }
  if (!bucket) {
    throw new Error("GCS bucket not configured. Use --gcs-bucket argument or GCS_BUCKET environment variable");
  }

  const prefix = args.prefix || '';
  const delimiter = args.delimiter || '/';
  const limit = args.limit || DEFAULT_LIMIT;
  const offset = args.offset || 0;

  // Get the GCS bucket
  const gcsBucket = gcs.bucket(bucket);
  
  // Get files with options for pagination and hierarchy
  const [files, , apiResponse] = await gcsBucket.getFiles({
    prefix,
    delimiter,
    maxResults: limit,
    pageToken: offset > 0 ? String(offset) : undefined,
  });

  // Extract prefixes (directories) from the API response
  const directories = apiResponse.prefixes || [];

  // Build the result structure
  const result = {
    files: files.map(file => ({
      name: file.name,
      size: parseInt(file.metadata.size, 10) || 0,
      updated: file.metadata.updated,
      contentType: file.metadata.contentType
    })),
    directories,
    pagination: {
      total: files.length + directories.length,
      nextOffset: apiResponse.nextPageToken ? 
        (offset + limit) : 
        null
    }
  };

  return result;
}