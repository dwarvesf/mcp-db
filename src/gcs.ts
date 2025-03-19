import { Storage } from '@google-cloud/storage';

export async function setupGCS(): Promise<Storage> {
  // Check for service account credentials
  const serviceAccount = process.env.GCP_SERVICE_ACCOUNT;
  if (serviceAccount) {
    const credentials = JSON.parse(
      Buffer.from(serviceAccount, 'base64').toString()
    );
    return new Storage({ credentials });
  }
  
  // Use default credentials
  return new Storage();
} 