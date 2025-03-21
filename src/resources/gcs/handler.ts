import { Storage } from '@google-cloud/storage';

export async function handleGCSObjectsResource(gcs: Storage, bucket: string) {
  if (!gcs) {
    throw new Error("GCS not initialized");
  }
  if (!bucket) {
    throw new Error("GCS bucket not configured. Use --gcs-bucket argument or GCS_BUCKET environment variable");
  }

  const [files] = await gcs.bucket(bucket).getFiles();
  return files.map(file => ({
    name: file.name,
    updated: file.metadata.updated
  }));
} 