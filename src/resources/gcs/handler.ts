import { Storage, File } from '@google-cloud/storage';

interface GCSResource {
  uri: string;
  name: string;
  description: string;
  content: {
    name: string;
    updated: string;
    size: number;
    contentType: string;
  };
}

export async function handleGCSObjectsResource(gcs: Storage, bucket: string): Promise<GCSResource[]> {
  if (!gcs) {
    throw new Error("GCS not initialized");
  }
  if (!bucket) {
    throw new Error("GCS bucket not configured. Use --gcs-bucket argument or GCS_BUCKET environment variable");
  }

  const [files] = await gcs.bucket(bucket).getFiles();
  
  // Transform each file into a resource with gcs:// URI
  return files.map((file: File) => ({
    uri: `gcs://${bucket}/${file.name}`,
    name: file.name,
    description: `GCS object in bucket ${bucket}`,
    content: {
      name: file.name,
      updated: file.metadata.updated || new Date().toISOString(),
      size: Number(file.metadata.size) || 0,
      contentType: file.metadata.contentType || 'application/octet-stream'
    }
  }));
} 