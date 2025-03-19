import { Storage } from '@google-cloud/storage';

export async function setupGCS(bucketName: string) {
  let storage: Storage;

  // Check for service account credentials
  const serviceAccount = process.env.GCP_SERVICE_ACCOUNT;
  if (serviceAccount) {
    const credentials = JSON.parse(
      Buffer.from(serviceAccount, 'base64').toString()
    );
    storage = new Storage({ credentials });
  } else {
    // Use default credentials
    storage = new Storage();
  }

  // Verify bucket access
  try {
    await storage.bucket(bucketName).exists();
    console.log('Successfully connected to GCS bucket');
    return storage;
  } catch (error) {
    console.error('Failed to connect to GCS:', error);
    throw error;
  }
} 