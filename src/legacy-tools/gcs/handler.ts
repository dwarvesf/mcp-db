import { Storage } from '@google-cloud/storage';

const DEFAULT_LIMIT = 1000;

export interface GCSDirectoryTreeArgs {
  prefix?: string;
  delimiter?: string;
  limit?: number;
  offset?: number;
}

// Interface for the GCS API response
interface GCSApiResponse {
  prefixes?: string[];
  nextPageToken?: string;
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

  // Type assertion for the API response
  const typedResponse = apiResponse as GCSApiResponse;
  
  // Extract prefixes (directories) from the API response
  const directories = typedResponse.prefixes || [];

  // Build the result structure
  const result = {
    bucket,
    files: files.map(file => ({
      name: file.name,
      // Handle potential undefined size safely
      size: file.metadata?.size ? parseInt(String(file.metadata.size), 10) : 0,
      updated: file.metadata?.updated,
      contentType: file.metadata?.contentType
    })),
    directories,
    pagination: {
      total: files.length + directories.length,
      nextOffset: typedResponse.nextPageToken ? 
        (offset + limit) : 
        null
    }
  };

  return result;
}