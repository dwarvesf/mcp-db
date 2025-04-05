import { MCPResource } from "mcp-framework";
import { Storage, GetFilesOptions } from '@google-cloud/storage';
import { serializeBigInt } from '../utils.js'; // Adjust path as needed
import { setupGCS } from "../services/gcs.js";
import { getConfig } from "../config.js"; // Import getConfig

export class GCSObjectsResource extends MCPResource { // Changed to export default
  uri = "mcp://gcs/objects"; // Keep original URI
  name = "gcs_objects";
  description = "List objects in the configured GCS bucket";
  mimeType = "application/json"; // Define MIME type

  private gcs!: Storage; // Add definite assignment assertion
  private bucketName: string;
  private gcsPromise: Promise<Storage>; // Store the promise

  // Constructor no longer receives bucketName, gets it from config
  constructor() {
    super();
    const config = getConfig(); // Get validated config
    if (!config.gcsBucket) {
      throw new Error("GCS bucket name is not configured. Set GCS_BUCKET environment variable or --gcs-bucket argument.");
    }
    this.bucketName = config.gcsBucket;

    // Initialize GCS client asynchronously, store the promise
    this.gcsPromise = setupGCS().then(gcsClient => {
      if (!gcsClient) {
        throw new Error("Failed to initialize Google Cloud Storage client for GCSObjectsResource");
      }
      this.gcs = gcsClient; // Assign when resolved
      return gcsClient;
    });
  }

  // Implement the read logic to list objects
  async read(): Promise<Array<{ uri: string; mimeType?: string; text: string }>> {
    console.error(`Handling resource request: ${this.uri}`);
    try {
      // Ensure GCS client is initialized before proceeding
      const gcsClient = await this.gcsPromise;

      // Basic listing - might need options like prefix, delimiter, pagination later
      const options: GetFilesOptions = {
        autoPaginate: true, // Get all objects for simplicity in this basic resource
        // Consider adding maxResults if the bucket is very large
      };

      const bucket = gcsClient.bucket(this.bucketName);
      const [files] = await bucket.getFiles(options);

      const objectsData = files.map(file => ({
        name: file.name,
        updated: file.metadata.updated,
        size: file.metadata.size,
        contentType: file.metadata.contentType,
      }));

      return [
        {
          uri: this.uri,
          mimeType: this.mimeType,
          text: JSON.stringify(serializeBigInt(objectsData), null, 2),
        },
      ];
    } catch (error) {
      console.error(`Error reading resource ${this.uri}:`, error);
      throw new Error(`GCS Objects Resource Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export default GCSObjectsResource;
