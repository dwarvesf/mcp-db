import { Storage } from '@google-cloud/storage';

let gcsClientInstance: Storage | null = null;

export async function setupGCS(): Promise<Storage> {
  if (gcsClientInstance) {
    return gcsClientInstance;
  }

  // Check for service account credentials
  const serviceAccount = process.env.GCP_SERVICE_ACCOUNT;
  if (serviceAccount) {
    const credentials = JSON.parse(
      Buffer.from(serviceAccount, 'base64').toString()
    );
    gcsClientInstance = new Storage({ credentials });
    return gcsClientInstance;
  }

  // Use default credentials
  gcsClientInstance = new Storage();
  return gcsClientInstance;
}

// Function to retrieve the initialized GCS client
export function getGCSClient(): Storage {
  if (!gcsClientInstance) {
    throw new Error("GCS client has not been initialized. Call setupGCS first.");
  }
  return gcsClientInstance;
}
